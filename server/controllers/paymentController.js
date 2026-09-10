const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const razorpayService = require('../utils/razorpayService');
const { sendNotification } = require('../utils/notificationService');

// Create a unique transaction number
const generateTransactionNumber = () => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${randomSuffix}`;
};

// @desc    Create a Razorpay order for an approved booking
// @route   POST /api/payments/create-order
// @access  Private (Customer only)
const createRazorpayOrder = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Administrators cannot process customer payments' });
    }

    const { bookingId } = req.body;
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid bookingId' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this booking' });
    }
    if (booking.status !== 'approved') {
      return res.status(400).json({ success: false, message: `Payment is only available for approved bookings (current: ${booking.status})` });
    }

    const existingPaid = await Payment.findOne({ booking: booking._id, paymentStatus: 'paid' });
    if (existingPaid) {
      return res.status(400).json({ success: false, message: 'Payment has already been completed for this booking' });
    }

    const amount = booking.totalPrice;

    // If Razorpay not configured, return test-mode instructions to the frontend.
    if (!razorpayService.isConfigured()) {
      return res.status(200).json({
        success: true,
        testMode: true,
        message: 'Razorpay is not configured. The simulated payment mode will be used for development/testing.',
        amount,
        currency: 'INR',
        bookingId: booking._id,
      });
    }

    const order = await razorpayService.createOrder({
      amount,
      currency: 'INR',
      receipt: booking.bookingNumber,
    });

    return res.status(200).json({
      success: true,
      testMode: false,
      order,
      keyId: razorpayService.getKeyId(),
      amount,
      currency: 'INR',
      bookingId: booking._id,
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error creating payment order' });
  }
};

// @desc    Verify Razorpay payment signature and finalize payment
// @route   POST /api/payments/verify
// @access  Private (Customer only)
const verifyRazorpayPayment = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Administrators cannot process customer payments' });
    }

    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod } = req.body;

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid bookingId' });
    }
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Razorpay order, payment and signature are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this booking' });
    }

    // Secure server-side signature verification
    const valid = razorpayService.verifySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!valid) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed. Payment not recorded.' });
    }

    const existingPaid = await Payment.findOne({ booking: booking._id, paymentStatus: 'paid' });
    if (existingPaid) {
      return res.status(400).json({ success: false, message: 'Payment has already been completed for this booking' });
    }

    const amount = booking.totalPrice;

    const payment = await Payment.create({
      transactionNumber: generateTransactionNumber(),
      booking: booking._id,
      customer: req.user._id,
      amount,
      paymentMethod: paymentMethod || 'UPI / Mobile Wallet',
      paymentStatus: 'paid',
      paymentDate: new Date(),
      gateway: 'razorpay',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amountBreakdown: booking.billing || {
        baseAmount: amount,
        transportCharge: 0,
        discount: 0,
        finalAmount: amount,
      },
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate({
        path: 'booking',
        select: 'bookingNumber invoiceNumber startDate endDate totalDays dailyRate totalPrice status billing',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone');

    await sendNotification({
      user: req.user,
      type: 'payment_success',
      title: 'Payment successful',
      message: `Your payment of ₹${amount} for booking ${booking.bookingNumber} was successful.`,
      data: { bookingId: booking._id, transactionNumber: payment.transactionNumber },
      sendSms: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Payment verified and recorded successfully',
      payment: populatedPayment,
    });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error verifying payment' });
  }
};

// @desc    Process a payment in simulated/test mode (for approved bookings when Razorpay is unavailable)
// @route   POST /api/payments/process
// @access  Private (Customer only)
const processPayment = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot process customer payments',
      });
    }

    const { bookingId, paymentMethod } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Please provide a valid bookingId' });
    }
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID format' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to process payment for another customer\'s booking' });
    }
    if (booking.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Payment can only be processed for approved bookings (current booking status is '${booking.status}')`,
      });
    }

    // Prevent duplicate successful payment for the same booking
    const existingPaid = await Payment.findOne({ booking: booking._id, paymentStatus: 'paid' });
    if (existingPaid) {
      return res.status(400).json({ success: false, message: 'Payment has already been completed for this booking' });
    }

    // If Razorpay is configured, do not allow the simulated path silently.
    if (razorpayService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Live payment gateway is enabled. Please use the Razorpay checkout flow.',
      });
    }

    // Amount is derived server-side from booking.totalPrice
    const amount = booking.totalPrice;

    const payment = await Payment.create({
      transactionNumber: generateTransactionNumber(),
      booking: booking._id,
      customer: req.user._id,
      amount,
      paymentMethod: paymentMethod || 'UPI / Mobile Wallet',
      paymentStatus: 'paid',
      paymentDate: new Date(),
      gateway: 'simulated',
      amountBreakdown: booking.billing || { baseAmount: amount, transportCharge: 0, discount: 0, finalAmount: amount },
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate({
        path: 'booking',
        select: 'bookingNumber invoiceNumber startDate endDate totalDays dailyRate totalPrice status billing',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone');

    await sendNotification({
      user: req.user,
      type: 'payment_success',
      title: 'Payment successful',
      message: `Your payment of ${amount} for booking ${booking.bookingNumber} was successful (simulated).`,
      data: { bookingId: booking._id, transactionNumber: payment.transactionNumber },
      sendSms: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Payment processed successfully (simulated mode)',
      payment: populatedPayment,
    });
  } catch (error) {
    console.error('Process payment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error processing payment' });
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
        select: 'bookingNumber invoiceNumber startDate endDate totalDays dailyRate totalPrice status billing',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    console.error('Get my payments error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving your payments' });
  }
};

// @desc    Get all payment transactions (Admin only)
// @route   GET /api/payments
// @access  Private/Admin
const getAllPayments = async (req, res) => {
  try {
    const { bookingId, status, customerId } = req.query;
    let query = {};

    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      query.booking = bookingId;
    }
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      query.customer = customerId;
    }
    if (status && status !== 'All') {
      query.paymentStatus = status;
    }

    const payments = await Payment.find(query)
      .populate({
        path: 'booking',
        select: 'bookingNumber invoiceNumber startDate endDate totalDays dailyRate totalPrice status billing',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone location address')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    console.error('Get all payments error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving payment transactions' });
  }
};

// @desc    Get single payment receipt by ID
// @route   GET /api/payments/:id
// @access  Private (Customer owner / Admin)
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID format' });
    }

    const payment = await Payment.findById(id)
      .populate({
        path: 'booking',
        select: 'bookingNumber invoiceNumber startDate endDate totalDays dailyRate totalPrice status billing',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone location address');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }
    if (req.user.role !== 'admin' && payment.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this payment record' });
    }

    return res.status(200).json({ success: true, payment });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving payment details' });
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
      return res.status(400).json({ success: false, message: 'Invalid payment ID format' });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }
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

    await sendNotification({
      user: { _id: payment.customer },
      type: 'payment_refunded',
      title: 'Payment refunded',
      message: `A refund was issued for transaction ${payment.transactionNumber}.`,
      data: { paymentId: payment._id, transactionNumber: payment.transactionNumber },
      sendSms: true,
    });

    const updatedPayment = await Payment.findById(id)
      .populate({
        path: 'booking',
        select: 'bookingNumber invoiceNumber startDate endDate totalDays dailyRate totalPrice status billing',
        populate: { path: 'equipment', select: 'name category dailyRate imageUrl location' },
      })
      .populate('customer', 'name email phone');

    return res.status(200).json({ success: true, message: 'Payment refunded successfully', payment: updatedPayment });
  } catch (error) {
    console.error('Refund payment error:', error);
    return res.status(500).json({ success: false, message: 'Server error refunding payment' });
  }
};

module.exports = {
  processPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  refundPayment,
};