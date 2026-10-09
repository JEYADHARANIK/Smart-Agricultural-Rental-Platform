const mongoose = require('mongoose');
const Equipment = require('../models/Equipment');
const Booking = require('../models/Booking');
const { getForecast } = require('../utils/weatherService');
const { runSlotAnalysis, recommendAlternatives, buildCandidateSlots } = require('../utils/schedulingEngine');

// @desc    Analyze a requested rental slot for a specific equipment with weather & maintenance
// @route   POST /api/scheduler/analyze
// @access  Private
const analyzeSlot = async (req, res) => {
  try {
    const { equipmentId, startDate, endDate, customerLocation, customerCoordinates } = req.body;

    if (!equipmentId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'equipmentId, startDate and endDate are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid equipment ID format' });
    }

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid dates provided' });
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date' });
    }

    if (
      customerCoordinates &&
      (customerCoordinates.lat == null || customerCoordinates.lng == null ||
        isNaN(Number(customerCoordinates.lat)) || isNaN(Number(customerCoordinates.lng)) ||
        Number(customerCoordinates.lat) < -90 || Number(customerCoordinates.lat) > 90 ||
        Number(customerCoordinates.lng) < -180 || Number(customerCoordinates.lng) > 180)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customerCoordinates. lat must be -90..90 and lng -180..180',
      });
    }

    const duration = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Fetch real weather forecast (graceful if missing/coordinates absent)
    const forecast = await getForecast({
      lat: equipment.coordinates && equipment.coordinates.lat,
      lng: equipment.coordinates && equipment.coordinates.lng,
      locationText: equipment.location,
      days: 8,
    });

    const analysis = await runSlotAnalysis({
      equipment,
      customerLocation: customerLocation || req.user.location || '',
      customerCoordinates: customerCoordinates || null,
      requestedStart: start,
      requestedDuration: duration,
      dailyForecast: forecast,
    });

    // Human-readable decision summary across all evaluated factors.
    const explanation = [
      ...(analysis.requestedSlot.reasons || []),
      analysis.recommendation === 'ok'
        ? 'The requested slot can be booked.'
        : analysis.recommendation === 'alternatives_required'
          ? 'The requested slot is unavailable; alternative dates are suggested below.'
          : 'The requested slot is free but weather conditions are poor; consider an alternative date.',
    ];

    return res.status(200).json({
      success: true,
      weatherAvailable: forecast.available,
      weatherReason: forecast.reason || null,
      explanation,
      ...analysis,
      // Expose the already-computed per-day forecast so the UI can visualize it.
      // No recomputation, no new algorithm — this is the same daily[] the engine used.
      dailyForecast: forecast,
      requestedSlot: {
        ...analysis.requestedSlot,
        weatherAvailable: forecast.available,
      },
    });
  } catch (error) {
    console.error('Analyze slot error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error analyzing slot' });
  }
};

// @desc    Find alternative equipment for a requested period when a specific unit is unavailable
// @route   POST /api/scheduler/alternatives
// @access  Private
const findAlternatives = async (req, res) => {
  try {
    const { startDate, endDate, category, location, excludeEquipmentId } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(0, 0, 0, 0);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, message: 'Invalid date range' });
    }
    const duration = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Candidate equipment: same category preferred, then other categories
    const baseQuery = { status: { $ne: 'Maintenance' } };
    if (excludeEquipmentId && mongoose.Types.ObjectId.isValid(excludeEquipmentId)) {
      baseQuery._id = { $ne: excludeEquipmentId };
    }
    if (location && category) {
      baseQuery.$or = [{ category }, { location: { $regex: location, $options: 'i' } }];
    } else if (category) {
      baseQuery.category = category;
    } else if (location) {
      baseQuery.location = { $regex: location, $options: 'i' };
    }

    const candidates = await Equipment.find(baseQuery).limit(20);

    if (candidates.length === 0) {
      return res.status(200).json({
        success: true,
        alternatives: [],
        message: 'No candidate equipment found for this requirement.',
      });
    }

    // Query conflicts for all candidates at once for efficiency
    const conflicts = await Booking.find({
      equipment: { $in: candidates.map((c) => c._id) },
      status: { $in: ['pending', 'approved', 'active'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    }).select('equipment startDate endDate');

    const conflictMap = new Map();
    conflicts.forEach((c) => {
      if (!conflictMap.has(c.equipment.toString())) conflictMap.set(c.equipment.toString(), []);
      conflictMap.get(c.equipment.toString()).push(c);
    });

    const forecast = await getForecast({
      lat: null, lng: null, locationText: location || '', days: 8,
    });

    const context = {
      customerLocation: location || req.user.location || '',
      customerCoordinates: null,
      requestedStart: start,
      requestedDuration: duration,
      dailyForecast: forecast,
    };

    const availableUnits = candidates.filter((c) => !conflictMap.has(c._id.toString()));

    const alternatives = await recommendAlternatives(availableUnits, context, { maxResults: 8 });

    // Re-rank with exact-request availability priority
    const sorted = alternatives
      .filter((a) => a.available === true)
      .slice(0, 6)
      .map((a) => ({
        equipment: {
          _id: a.equipmentId,
          name: a.equipmentName,
        },
        slot: a.slot,
        classification: a.classification,
        score: a.score,
        reasons: a.reasons,
      }));

    return res.status(200).json({
      success: true,
      requestedPeriod: { start, end, duration },
      alternatives: sorted,
      weatherAvailable: forecast.available,
    });
  } catch (error) {
    console.error('Find alternatives error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error finding alternatives' });
  }
};

module.exports = {
  analyzeSlot,
  findAlternatives,
};