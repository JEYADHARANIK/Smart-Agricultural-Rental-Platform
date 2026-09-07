const express = require('express');
const router = express.Router();
const { recommendEquipment } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/ai/recommend-equipment
// @access  Private (Authenticated users)
router.post('/recommend-equipment', protect, recommendEquipment);

module.exports = router;
