const mongoose = require('mongoose');
const Equipment = require('../models/Equipment');

// @desc    Get all equipment (with optional filters)
// @route   GET /api/equipment
// @access  Public
const getEquipment = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const equipment = await Equipment.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: equipment.length,
      equipment,
    });
  } catch (error) {
    console.error('Get equipment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving equipment',
    });
  }
};

// @desc    Get single equipment by ID
// @route   GET /api/equipment/:id
// @access  Public
const getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid equipment ID format',
      });
    }

    const equipment = await Equipment.findById(id).populate('createdBy', 'name email');

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment machine not found',
      });
    }

    return res.status(200).json({
      success: true,
      equipment,
    });
  } catch (error) {
    console.error('Get equipment by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving equipment details',
    });
  }
};

// @desc    Create new equipment machine
// @route   POST /api/equipment
// @access  Private/Admin
const createEquipment = async (req, res) => {
  try {
    const { name, category, description, dailyRate, status, location, imageUrl, usageHours, maintenanceIntervalDays, coordinates } = req.body;

    if (!name || !description || dailyRate === undefined || dailyRate === null) {
      return res.status(400).json({
        success: false,
        message: 'Please provide required fields: name, description, and dailyRate',
      });
    }

    const parsedRate = Number(dailyRate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      return res.status(400).json({
        success: false,
        message: 'dailyRate must be a non-negative number',
      });
    }

    const parsedHours = usageHours !== undefined && usageHours !== null ? Number(usageHours) : 0;
    if (isNaN(parsedHours) || parsedHours < 0) {
      return res.status(400).json({
        success: false,
        message: 'usageHours must be a non-negative number',
      });
    }

    const parsedInterval = maintenanceIntervalDays !== undefined && maintenanceIntervalDays !== null ? Number(maintenanceIntervalDays) : 90;
    if (isNaN(parsedInterval) || parsedInterval < 1) {
      return res.status(400).json({
        success: false,
        message: 'maintenanceIntervalDays must be at least 1',
      });
    }

    // Validate optional coordinates
    let coordinatesToSave = { lat: null, lng: null };
    if (coordinates && coordinates.lat != null && coordinates.lng != null) {
      const lat = Number(coordinates.lat);
      const lng = Number(coordinates.lng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates. lat must be -90..90 and lng -180..180',
        });
      }
      coordinatesToSave = { lat, lng };
    }

    const equipment = await Equipment.create({
      name,
      category: category || 'Tractors',
      description,
      dailyRate: parsedRate,
      status: status || 'Available',
      location: location || '',
      imageUrl: imageUrl || '',
      createdBy: req.user._id,
      usageHours: parsedHours,
      maintenanceIntervalDays: parsedInterval,
      coordinates: coordinatesToSave,
    });

    return res.status(201).json({
      success: true,
      message: 'Equipment created successfully',
      equipment,
    });
  } catch (error) {
    console.error('Create equipment error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating equipment',
    });
  }
};

// @desc    Update existing equipment machine
// @route   PUT /api/equipment/:id
// @access  Private/Admin
const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid equipment ID format',
      });
    }

    let equipment = await Equipment.findById(id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment machine not found',
      });
    }

    if (req.body.dailyRate !== undefined) {
      const parsedRate = Number(req.body.dailyRate);
      if (isNaN(parsedRate) || parsedRate < 0) {
        return res.status(400).json({
          success: false,
          message: 'dailyRate must be a non-negative number',
        });
      }
      req.body.dailyRate = parsedRate;
    }

    if (req.body.usageHours !== undefined && req.body.usageHours !== null) {
      const parsedHours = Number(req.body.usageHours);
      if (isNaN(parsedHours) || parsedHours < 0) {
        return res.status(400).json({
          success: false,
          message: 'usageHours must be a non-negative number',
        });
      }
      req.body.usageHours = parsedHours;
    }

    if (req.body.maintenanceIntervalDays !== undefined && req.body.maintenanceIntervalDays !== null) {
      const parsedInterval = Number(req.body.maintenanceIntervalDays);
      if (isNaN(parsedInterval) || parsedInterval < 1) {
        return res.status(400).json({
          success: false,
          message: 'maintenanceIntervalDays must be at least 1',
        });
      }
      req.body.maintenanceIntervalDays = parsedInterval;
    }

    // Validate & normalize coordinates
    if (req.body.coordinates && req.body.coordinates.lat != null && req.body.coordinates.lng != null) {
      const lat = Number(req.body.coordinates.lat);
      const lng = Number(req.body.coordinates.lng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates. lat must be -90..90 and lng -180..180',
        });
      }
      req.body.coordinates = { lat, lng };
    }

    // Auto-compute next maintenance due from interval when applicable
    if (req.body.lastMaintenanceDate) {
      const base = new Date(req.body.lastMaintenanceDate);
      const interval = Number(req.body.maintenanceIntervalDays !== undefined ? req.body.maintenanceIntervalDays : equipment.maintenanceIntervalDays) || 90;
      if (!isNaN(base.getTime())) {
        const next = new Date(base);
        next.setDate(next.getDate() + interval);
        req.body.nextMaintenanceDue = next;
      }
    } else if (req.body.maintenanceIntervalDays !== undefined && equipment.lastMaintenanceDate) {
      const base = new Date(equipment.lastMaintenanceDate);
      const next = new Date(base);
      next.setDate(next.getDate() + Number(req.body.maintenanceIntervalDays));
      req.body.nextMaintenanceDue = next;
    }

    // Do not allow overriding createdBy from client body
    delete req.body.createdBy;

    equipment = await Equipment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Equipment updated successfully',
      equipment,
    });
  } catch (error) {
    console.error('Update equipment error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating equipment',
    });
  }
};

// @desc    Delete equipment machine
// @route   DELETE /api/equipment/:id
// @access  Private/Admin
const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid equipment ID format',
      });
    }

    const equipment = await Equipment.findById(id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment machine not found',
      });
    }

    await equipment.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Equipment deleted successfully',
    });
  } catch (error) {
    console.error('Delete equipment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting equipment',
    });
  }
};

module.exports = {
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
};
