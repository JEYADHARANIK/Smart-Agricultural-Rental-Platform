const express = require('express');
const router = express.Router();
const { getAllCustomers, getCustomerById } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All user management routes are admin-only
router.use(protect, authorize('admin'));

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);

module.exports = router;
