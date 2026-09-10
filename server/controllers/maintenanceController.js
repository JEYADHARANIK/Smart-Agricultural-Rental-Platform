const mongoose = require('mongoose');
const Equipment = require('../models/Equipment');
const Booking = require('../models/Booking');
const { computeRisk } = require('../utils/maintenanceRisk');
const { sendNotification } = require('../utils/notificationService');

// Helper: derive next maintenance due date from lastMaintenanceDate + interval
const computeNextDue = (equipment) => {
  const base = equipment.lastMaintenanceDate ? new Date(equipment.lastMaintenanceDate) : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + (equipment.maintenanceIntervalDays || 90));
  return next;
};

// @desc    Record a maintenance event for an equipment
// @route   POST /api/maintenance
// @access  Private/Admin
const recordMaintenance = async (req, res) => {
  try {
    const { equipmentId, date, type, notes, usageHoursAtService } = req.body;

    if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid equipment ID format' });
    }
    if (!equipmentId || !date) {
      return res.status(400).json({ success: false, message: 'Please provide equipmentId and date' });
    }

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const mDate = new Date(date);
    if (isNaN(mDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid maintenance date' });
    }

    const entry = {
      date: mDate,
      type: type || 'General',
      notes: notes || '',
      usageHoursAtService:
        usageHoursAtService !== undefined && usageHoursAtService !== null
          ? Number(usageHoursAtService) || 0
          : equipment.usageHours || 0,
    };

    equipment.maintenanceHistory.push(entry);
    equipment.lastMaintenanceDate = mDate;
    equipment.maintenanceType = entry.type;
    equipment.maintenanceNotes = entry.notes || equipment.maintenanceNotes;
    if (entry.usageHoursAtService > (equipment.usageHours || 0)) {
      equipment.usageHours = entry.usageHoursAtService;
    }
    equipment.nextMaintenanceDue = computeNextDue(equipment);
    // Equipment exits maintenance after completed service
    if (equipment.status === 'Maintenance') {
      equipment.status = 'Available';
    }

    const updated = await equipment.save();

    return res.status(201).json({
      success: true,
      message: 'Maintenance record saved successfully',
      equipment: updated,
    });
  } catch (error) {
    console.error('Record maintenance error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error recording maintenance' });
  }
};

// @desc    Update usage/interval/maintenance metadata on equipment
// @route   PUT /api/maintenance/equipment/:id
// @access  Private/Admin
const updateEquipmentMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid equipment ID format' });
    }

    let equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const allowed = [
      'usageHours',
      'maintenanceIntervalDays',
      'lastMaintenanceDate',
      'maintenanceType',
      'maintenanceNotes',
      'status',
    ];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        equipment[field] = req.body[field];
      }
    });

    if (req.body.lastMaintenanceDate) {
      equipment.nextMaintenanceDue = computeNextDue(equipment);
    } else if (equipment.lastMaintenanceDate) {
      equipment.nextMaintenanceDue = computeNextDue(equipment);
    }

    await equipment.save();

    return res.status(200).json({
      success: true,
      message: 'Maintenance metadata updated successfully',
      equipment,
    });
  } catch (error) {
    console.error('Update maintenance metadata error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error updating maintenance metadata' });
  }
};

// @desc    Get maintenance dashboard stats (real DB data)
// @route   GET /api/maintenance/dashboard
// @access  Private/Admin
const getMaintenanceDashboard = async (req, res) => {
  try {
    const equipment = await Equipment.find().lean();
    const now = new Date();

    let totalEquipment = equipment.length;
    let underMaintenance = equipment.filter((e) => e.status === 'Maintenance').length;
    let dueSoonList = [];
    let overdueList = [];
    let upcomingList = [];
    let flaggedEquipment = [];

    for (const item of equipment) {
      const risk = computeRisk(item);
      const record = { ...item, risk };

      if (item.nextMaintenanceDue) {
        const due = new Date(item.nextMaintenanceDue);
        const daysToDue = Math.floor((due - now) / (1000 * 60 * 60 * 24));
        if (due < now) {
          overdueList.push({ ...record, daysOverdue: Math.abs(daysToDue) });
        } else if (daysToDue <= 3) {
          dueSoonList.push({ ...record, daysToDue });
        } else if (daysToDue <= 14) {
          upcomingList.push({ ...record, daysToDue });
        }
      }

      if (risk.riskLevel === 'High' || risk.riskLevel === 'Medium' || item.status === 'Maintenance') {
        flaggedEquipment.push(record);
      }
    }

    // aggregate usage hours
    const totalUsageHours = equipment.reduce((s, e) => s + (Number(e.usageHours) || 0), 0);

    return res.status(200).json({
      success: true,
      dashboard: {
        totalEquipment,
        underMaintenance,
        maintenanceDue: dueSoonList.length,
        maintenanceOverdue: overdueList.length,
        upcomingMaintenance: upcomingList.length,
        totalUsageHours,
        equipmentRequiringAttention: flaggedEquipment.length,
        dueSoon: dueSoonList.sort((a, b) => a.daysToDue - b.daysToDue),
        overdue: overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue),
        upcoming: upcomingList.sort((a, b) => a.daysToDue - b.daysToDue),
        flagged: flaggedEquipment.sort((a, b) => b.risk.score - a.risk.score),
        // status distribution for visualization
        statusDistribution: {
          Available: equipment.filter((e) => e.status === 'Available').length,
          Rented: equipment.filter((e) => e.status === 'Rented').length,
          Maintenance: underMaintenance,
        },
        recentMaintenance: equipment
          .filter((e) => e.maintenanceHistory && e.maintenanceHistory.length)
          .flatMap((e) =>
            e.maintenanceHistory.map((h) => ({
              equipmentId: e._id,
              equipmentName: e.name,
              date: h.date,
              type: h.type,
              notes: h.notes,
            }))
          )
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Maintenance dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Server error computing maintenance dashboard' });
  }
};

// @desc    Get predictive maintenance risk for a single equipment
// @route   GET /api/maintenance/equipment/:id/risk
// @access  Private
const getEquipmentRisk = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid equipment ID format' });
    }
    const equipment = await Equipment.findById(id).lean();
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }
    const risk = computeRisk(equipment);
    return res.status(200).json({ success: true, risk });
  } catch (error) {
    console.error('Equipment risk error:', error);
    return res.status(500).json({ success: false, message: 'Server error computing risk' });
  }
};

// @desc    List maintenance history for all equipment (admin)
// @route   GET /api/maintenance
// @access  Private/Admin
const getAllMaintenance = async (req, res) => {
  try {
    const equipment = await Equipment.find()
      .select('_id name category status usageHours lastMaintenanceDate nextMaintenanceDue maintenanceIntervalDays maintenanceHistory')
      .sort({ updatedAt: -1 });
    return res.status(200).json({ success: true, count: equipment.length, equipment });
  } catch (error) {
    console.error('Get all maintenance error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving maintenance records' });
  }
};

// @desc    Check maintenance restrictions for a specific equipment + date range
// @route   POST /api/maintenance/check
// @access  Private
const checkMaintenanceRestrictions = async (req, res) => {
  try {
    const { equipmentId, startDate, endDate } = req.body;
    if (!equipmentId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'equipmentId, startDate and endDate are required' });
    }
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(0, 0, 0, 0);

    let restricted = false;
    let reason = '';

    if (equipment.status === 'Maintenance') {
      restricted = true;
      reason = 'Equipment is currently under maintenance and cannot be booked.';
    } else if (equipment.nextMaintenanceDue) {
      const due = new Date(equipment.nextMaintenanceDue); due.setHours(0, 0, 0, 0);
      const bufferEnd = new Date(due); bufferEnd.setDate(bufferEnd.getDate() + 3);
      if (start <= bufferEnd && end >= due) {
        restricted = true;
        reason = `Scheduled maintenance is due ${due.toISOString().slice(0, 10)}.`;
      }
    }

    return res.status(200).json({ success: true, restricted, reason, equipment });
  } catch (error) {
    console.error('Maintenance check error:', error);
    return res.status(500).json({ success: false, message: 'Server error checking maintenance' });
  }
};

module.exports = {
  recordMaintenance,
  updateEquipmentMaintenance,
  getMaintenanceDashboard,
  getEquipmentRisk,
  getAllMaintenance,
  checkMaintenanceRestrictions,
};