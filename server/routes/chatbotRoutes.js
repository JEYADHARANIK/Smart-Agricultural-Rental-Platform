const express = require('express');
const router = express.Router();
const { chatMessage, getLanguages } = require('../controllers/chatbotController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/languages', getLanguages);
router.post('/message', chatMessage);

module.exports = router;