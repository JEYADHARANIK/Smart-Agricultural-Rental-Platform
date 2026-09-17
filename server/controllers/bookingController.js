const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Equipment = require('../models/Equipment');
const Payment = require('../models/Payment');
const { getForecast } = require('../utils/weatherService');
const { evaluateWeather, evaluateMaintenance, normalizeDate, dayKey } = require('../utils/schedulingEngine');
const { sendNotification } = require('../utils/notificationService');

// @desc    Create a new rental booking request
// @route   POST /api/bookings
// @access  Private (Customer only)
const createBooking = async (req, res) => {
  try {
    // Admins cannot create customer booking requests
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot submit customer booking requests',
      });
    }

    const { equipmentId, startDate, endDate, transportCharge, discount, transportNotes } = req.body;

    if (!equipmentId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide equipmentId, startDate, and endDate',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid equipment ID format',
      });
    }

    // Verify equipment exists
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment machine not found',
      });
    }

    // Reject if equipment is in maintenance
    if (equipment.status === 'Maintenance') {
      return res.status(400).json({
        success: false,
        message: 'Equipment is currently undergoing maintenance and cannot be reserved',
      });
    }

    // Normalize dates (start of day)
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid start and end dates',
      });
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past',
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date',
      });
    }

    // Reject if the requested window overlaps a scheduled maintenance due date (+3 day buffer),
    // reusing the same rule the scheduling engine applies (evaluateMaintenance).
    const maintenanceCheck = evaluateMaintenance(
      { status: equipment.status, nextMaintenanceDue: equipment.nextMaintenanceDue },
      { start, end }
    );
    if (maintenanceCheck.restriction) {
      return res.status(400).json({
        success: false,
        message: maintenanceCheck.reason,
      });
    }

    // Calculate totalDays server-side (same start & end date = 1 day)
    const diffTime = end.getTime() - start.getTime();
    const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Daily rate snapshot from Equipment model
    const dailyRate = equipment.dailyRate;

    // ---- Server-side billing validation (never trust the client) ----
    const parsedTransport = transportCharge !== undefined ? Number(transportCharge) : 0;
    const parsedDiscount = discount !== undefined ? Number(discount) : 0;
    const transport = isNaN(parsedTransport) || parsedTransport < 0 ? 0 : parsedTransport;
    const disc = isNaN(parsedDiscount) || parsedDiscount < 0 ? 0 : parsedDiscount;
    const baseAmount = totalDays * dailyRate;
    const usableDiscount = Math.min(disc, baseAmount);
    const finalAmount = baseAmount + transport - usableDiscount;

    // Date collision detection (pending, approved, active block conflicting dates)
    const existingCollision = await Booking.findOne({
      equipment: equipment._id,
      status: { $in: ['pending', 'approved', 'active'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (existingCollision) {
      return res.status(400).json({
        success: false,
        message: 'Equipment is already reserved or pending approval for the selected dates',
      });
    }

    // ---- Weather-aware slot evaluation (graceful when forecast unavailable) ----
    let weatherSlot = {
      classification: 'UNKNOWN',
      summary: 'Weather forecast unavailable at booking time.',
      reasons: [],
      checkedAt: new Date(),
    };

    try {
      const forecast = await getForecast({
        lat: equipment.coordinates && equipment.coordinates.lat,
        lng: equipment.coordinates && equipment.coordinates.lng,
        locationText: equipment.location,
        days: totalDays + 1,
      });
      const requestSlot = { start, end };
      const weatherResult = evaluateWeather(forecast, requestSlot);
      weatherSlot = {
        classification: weatherResult.classification || 'UNKNOWN',
        summary: weatherResult.summary || '',
        reasons: weatherResult.reasons || [],
        checkedAt: new Date(),
      };
    } catch (weatherError) {
      console.error('Weather analysis at booking error:', weatherError?.message || weatherError);
    }

    // Generate human-readable booking number & invoice number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${randomSuffix}`;
    const randomInvoice = Math.floor(10000 + Math.random() * 90000);
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-${dateStamp}-${randomInvoice}`;

    const booking = await Booking.create({
      bookingNumber,
      invoiceNumber,
      equipment: equipment._id,
      customer: req.user._id,
      startDate: start,
      endDate: end,
      totalDays,
      dailyRate,
      totalPrice: finalAmount,
      billing: {
        baseAmount,
        transportCharge: transport,
        discount: usableDiscount,
        finalAmount,
      },
      transportNotes: transportNotes || '',
      weatherSlot,
      status: 'pending',
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('equipment', 'name category dailyRate imageUrl location')
      .populate('customer', 'name email phone');

    // ---- Notifications ----
    await sendNotification({
      user: req.user,
      type: 'booking_submitted',
      title: 'Booking request submitted',
      message: `Your booking request ${booking.bookingNumber} for ${equipment.name} has been submitted and is awaiting approval.`,
      data: { bookingId: booking._id, bookingNumber },
      sendSms: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully',
      booking: populatedBooking,
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating booking request',
    });
  }
};

// @desc    Get logged-in customer's bookings
// @route   GET /api/bookings/my-bookings
// @access  Private (Customer / Admin)
const getMyBookings = async (req, res) => {
  try {
    const { upcoming, past } = req.query;
    const query = { customer: req.user._id };
    const today = new Date();

    if (req.user.role === 'admin') {
      if (req.query.customerId && !mongoose.Types.ObjectId.isValid(req.query.customerId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID format',
        });
      }
      query.customer = req.query.customerId || req.user._id;
    }

    if (upcoming === 'true') {
      query.endDate = { $gte: today };
    } else if (past === 'true') {
      query.endDate = { $lt: today };
    }

    const bookings = await Booking.find(query)
      .populate('equipment', 'name category dailyRate imageUrl location status')
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving your bookings',
    });
  }
};

// @desc    Get all fleet bookings (Admin only)
// @route   GET /api/bookings
// @access  Private/Admin
const getAllBookings = async (req, res) => {
  try {
    const { status, customerId, from, to } = req.query;
    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID format',
        });
      }
      query.customer = customerId;
    }

    if (from || to) {
      query.startDate = {};
      if (from) query.startDate.$gte = new Date(from);
      if (to) query.startDate.$lte = new Date(to);
    }

    const bookings = await Booking.find(query)
      .populate('equipment', 'name category dailyRate imageUrl location status')
      .populate('customer', 'name email phone location address')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving all bookings',
    });
  }
};

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
// @access  Private (Customer owner / Admin)
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id)
      .populate('equipment', 'name category dailyRate imageUrl location status')
      .populate('customer', 'name email phone location address');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking record not found',
      });
    }

    // Customer can only view their own booking
    if (req.user.role !== 'admin' && booking.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking record',
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving booking details',
    });
  }
};

// @desc    Update booking status (Approve / Reject / Activate / Complete)
// @route   PATCH /api/bookings/:id/status
// @access  Private/Admin
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking record not found',
      });
    }

    const validStatuses = ['approved', 'rejected', 'active', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status parameter. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Validate state transitions
    if (booking.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of a rejected booking',
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of a cancelled booking',
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of a completed booking',
      });
    }

    // Approving a booking must re-validate conflict to prevent double-booking
    if (status === 'approved') {
      const collision = await Booking.findOne({
        _id: { $ne: booking._id },
        equipment: booking.equipment,
        status: { $in: ['pending', 'approved', 'active'] },
        startDate: { $lte: booking.endDate },
        endDate: { $gte: booking.startDate },
      });
      if (collision) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve: equipment is already reserved by booking ${collision.bookingNumber} for overlapping dates.`,
        });
      }
    }

    // A rental can only start or complete once its payment has been settled (paid).
    if (status === 'active' || status === 'completed') {
      const paidPayment = await Payment.findOne({ booking: booking._id, paymentStatus: 'paid' });
      if (!paidPayment) {
        return res.status(400).json({
          success: false,
          message: `Booking #${booking.bookingNumber} must be paid before it can be marked as ${status}.`,
        });
      }
    }

    booking.status = status;
    if (adminRemarks !== undefined) {
      booking.adminRemarks = adminRemarks;
    }

    await booking.save();

    const updatedBooking = await Booking.findById(id)
      .populate('equipment', 'name category dailyRate imageUrl location')
      .populate('customer', 'name email phone');

    // Update equipment status when a booking becomes active
    if (status === 'active') {
      await Equipment.findByIdAndUpdate(booking.equipment, { status: 'Rented' });
    } else if (status === 'completed' || status === 'cancelled' || status === 'rejected') {
      const activeBookings = await Booking.countDocuments({
        equipment: booking.equipment,
        status: { $in: ['active', 'approved'] },
        _id: { $ne: booking._id },
      });
      if (activeBookings === 0) {
        await Equipment.findByIdAndUpdate(booking.equipment, { status: 'Available' });
      }
    }

    // Notify the customer
    const equipmentName = updatedBooking.equipment?.name || 'the equipment';
    const typeMap = {
      approved: { type: 'booking_approved', title: 'Booking approved', message: `Great news! Your booking ${booking.bookingNumber} for ${equipmentName} has been approved.` },
      rejected: { type: 'booking_rejected', title: 'Booking rejected', message: `Your booking ${booking.bookingNumber} for ${equipmentName} was not approved. ${adminRemarks ? 'Reason: ' + adminRemarks : ''}` },
      active: { type: 'schedule_change', title: 'Rental started', message: `Your rental ${booking.bookingNumber} for ${equipmentName} is now active.` },
      completed: { type: 'system', title: 'Rental completed', message: `Your rental ${booking.bookingNumber} for ${equipmentName} is complete. Thank you!` },
      cancelled: { type: 'booking_cancelled', title: 'Booking cancelled', message: `Your booking ${booking.bookingNumber} for ${equipmentName} was cancelled by the equipment owner.` },
    };
    const notif = typeMap[status];
    if (notif) {
      await sendNotification({
        user: { _id: booking.customer },
        type: notif.type,
        title: notif.title,
        message: notif.message,
        data: { bookingId: booking._id, bookingNumber: booking.bookingNumber },
        sendSms: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating booking status',
    });
  }
};

// @desc    Cancel a booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (Customer owner / Admin)
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking record not found',
      });
    }

    // Authorization check
    if (req.user.role !== 'admin' && booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }

    // Can only cancel pending or approved bookings
    if (booking.status !== 'pending' && booking.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with current status '${booking.status}'`,
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    await sendNotification({
      user: { _id: booking.customer },
      type: 'booking_cancelled',
      title: 'Booking cancelled',
      message: `Your booking ${booking.bookingNumber} has been cancelled.`,
      data: { bookingId: booking._id, bookingNumber: booking.bookingNumber },
      sendSms: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error cancelling booking',
    });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
};