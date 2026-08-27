const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

// @desc    Process a simulated payment for an approved booking
// @route   POST /api/payments/process
// @access  Private (Customer only)
const processPayment = async (req, res) => {
  try {
    // Admin check: Admins cannot process customer payments
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot process customer payments',
      });
    }

    const { bookingId, paymentMethod } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid bookingId',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    // Load booking from MongoDB
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking record not found',
      });
    }

    // Verify booking belongs to authenticated customer
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process payment for another customer\'s booking',
      });
    }

    // Verify booking status is "approved"
    if (booking.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Payment can only be processed for approved bookings (current booking status is '${booking.status}')`,
      });
    }

    // Prevent duplicate successful payment for the same booking
    const existingPaid = await Payment.findOne({
      booking: booking._id,
      paymentStatus: 'paid',
    });

    if (existingPaid) {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been completed for this booking',
      });
    }

    // Amount is derived server-side from booking.totalPrice (never trust client amount)
    const amount = booking.totalPrice;

    // Generate unique transaction number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const transactionNumber = `TXN-${randomSuffix}`;

    const payment = await Payment.create({
      transactionNumber,
      booking: booking._id,
      customer: req.user._id,
      amount,
      paymentMethod: paymentMethod || 'UPI / Mobile Wallet',
      paymentStatus: 'paid',
      paymentDate: new Date(),
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate({
        path: 'booking',
        select: 'bookingNumber startDate endDate totalDays dailyRate totalPrice status',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone');

    return res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      payment: populatedPayment,
    });
  } catch (error) {
    console.error('Process payment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error processing payment',
    });
  }
};

// @desc    Get logged-in customer's payments
// @route   GET /api/payments/my-payments
// @access  Private (Customer / Admin)
const getMyPayments = async (req, res) => {
  try {
    const { bookingId } = req.query;
    let query = { customer: req.user._id };

    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      query.booking = bookingId;
    }

    const payments = await Payment.find(query)
      .populate({
        path: 'booking',
        select: 'bookingNumber startDate endDate totalDays dailyRate totalPrice status',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('Get my payments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving your payments',
    });
  }
};

// @desc    Get all payment transactions (Admin only)
// @route   GET /api/payments
// @access  Private/Admin
const getAllPayments = async (req, res) => {
  try {
    const { bookingId, status } = req.query;
    let query = {};

    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      query.booking = bookingId;
    }

    if (status && status !== 'All') {
      query.paymentStatus = status;
    }

    const payments = await Payment.find(query)
      .populate({
        path: 'booking',
        select: 'bookingNumber startDate endDate totalDays dailyRate totalPrice status',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone location address')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving payment transactions',
    });
  }
};

// @desc    Get single payment receipt by ID
// @route   GET /api/payments/:id
// @access  Private (Customer owner / Admin)
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format',
      });
    }

    const payment = await Payment.findById(id)
      .populate({
        path: 'booking',
        select: 'bookingNumber startDate endDate totalDays dailyRate totalPrice status',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone location address');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Customer ownership check
    if (req.user.role !== 'admin' && payment.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment record',
      });
    }

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving payment details',
    });
  }
};

// @desc    Issue a refund for a payment
// @route   PATCH /api/payments/:id/refund
// @access  Private/Admin
const refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format',
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Allowed refund state: must be currently 'paid'
    if (payment.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: `Cannot refund payment with current status '${payment.paymentStatus}' (only 'paid' payments can be refunded)`,
      });
    }

    payment.paymentStatus = 'refunded';
    if (adminNotes !== undefined) {
      payment.adminNotes = adminNotes;
    }

    await payment.save();

    // CRITICAL REQUIREMENT: Do NOT modify or cancel the associated booking document here.
    // Payment and Booking remain separate state machines.

    const updatedPayment = await Payment.findById(id)
      .populate({
        path: 'booking',
        select: 'bookingNumber startDate endDate totalDays dailyRate totalPrice status',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone');

    return res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      payment: updatedPayment,
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error refunding payment',
    });
  }
};

module.exports = {
  processPayment,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  refundPayment,
};
