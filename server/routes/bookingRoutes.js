const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All booking routes require authentication
router.use(protect);

// Specific named routes FIRST before parametric routes
router.post('/', authorize('customer'), createBooking);
router.get('/my-bookings', getMyBookings);
router.get('/', authorize('admin'), getAllBookings);

// Parametric ID routes AFTER
router.get('/:id', getBookingById);
router.patch('/:id/status', authorize('admin'), updateBookingStatus);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
