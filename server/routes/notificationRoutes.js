const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAllRead,
  markOneRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMyNotifications);
router.put('/read-all', markAllRead);
router.patch('/:id/read', markOneRead);

module.exports = router;