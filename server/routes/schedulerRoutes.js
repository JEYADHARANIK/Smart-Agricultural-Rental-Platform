const express = require('express');
const router = express.Router();
const { analyzeSlot, findAlternatives } = require('../controllers/schedulerController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/analyze', analyzeSlot);
router.post('/alternatives', findAlternatives);

module.exports = router;