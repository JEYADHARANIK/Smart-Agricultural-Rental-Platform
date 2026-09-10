const express = require('express');
const router = express.Router();
const {
  getAdminAnalytics,
  getCustomerAnalytics,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/dashboard', authorize('admin'), getAdminAnalytics);
router.get('/my-dashboard', getCustomerAnalytics);

module.exports = router;