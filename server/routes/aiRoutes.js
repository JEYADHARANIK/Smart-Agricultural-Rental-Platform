const express = require('express');
const router = express.Router();
const {
  recommendEquipment,
  getCapabilitiesController,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/ai/recommend-equipment
// @access  Private (Authenticated users)
router.post('/recommend-equipment', protect, recommendEquipment);

// @route   GET /api/ai/capabilities
// @access  Private (Authenticated users) - honest runtime capability report
router.get('/capabilities', protect, getCapabilitiesController);

module.exports = router;
