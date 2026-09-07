const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Equipment = require('../models/Equipment');

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

    const { equipmentId, startDate, endDate } = req.body;

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

    // Calculate totalDays server-side (same start & end date = 1 day)
    const diffTime = end.getTime() - start.getTime();
    const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Daily rate snapshot from Equipment model
    const dailyRate = equipment.dailyRate;
    const totalPrice = totalDays * dailyRate;

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

    // Generate human-readable booking number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${randomSuffix}`;

    const booking = await Booking.create({
      bookingNumber,
      equipment: equipment._id,
      customer: req.user._id,
      startDate: start,
      endDate: end,
      totalDays,
      dailyRate,
      totalPrice,
      status: 'pending',
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('equipment', 'name category dailyRate imageUrl location')
      .populate('customer', 'name email phone');

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
    const bookings = await Booking.find({ customer: req.user._id })
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
    const { status, customerId } = req.query;
    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    // Optional: filter by a specific customer ID (used by Customer Management module)
    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID format',
        });
      }
      query.customer = customerId;
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

// @desc    Update booking status (Approve / Reject)
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

    booking.status = status;
    if (adminRemarks !== undefined) {
      booking.adminRemarks = adminRemarks;
    }

    await booking.save();

    const updatedBooking = await Booking.findById(id)
      .populate('equipment', 'name category dailyRate imageUrl location')
      .populate('customer', 'name email phone');

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
