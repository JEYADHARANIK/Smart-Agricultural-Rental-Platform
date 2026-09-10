const express = require('express');
const router = express.Router();
const {
  processPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  refundPayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All payment routes require authentication
router.use(protect);

// Named routes FIRST before parametric routes
router.post('/create-order', authorize('customer'), createRazorpayOrder);
router.post('/verify', authorize('customer'), verifyRazorpayPayment);
router.post('/process', authorize('customer'), processPayment);
router.get('/my-payments', getMyPayments);
router.get('/', authorize('admin'), getAllPayments);

// Parametric ID routes AFTER
router.get('/:id', getPaymentById);
router.patch('/:id/refund', authorize('admin'), refundPayment);

module.exports = router;