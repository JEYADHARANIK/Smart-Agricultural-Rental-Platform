const express = require('express');
const router = express.Router();
const {
  recordMaintenance,
  updateEquipmentMaintenance,
  getMaintenanceDashboard,
  getEquipmentRisk,
  getAllMaintenance,
  checkMaintenanceRestrictions,
} = require('../controllers/maintenanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

// Admin: dashboard + management
router.get('/dashboard', authorize('admin'), getMaintenanceDashboard);
router.get('/', authorize('admin'), getAllMaintenance);
router.post('/', authorize('admin'), recordMaintenance);
router.put('/equipment/:id', authorize('admin'), updateEquipmentMaintenance);

// Shared endpoints (customer & admin can check restrictions / risk)
router.post('/check', checkMaintenanceRestrictions);
router.get('/equipment/:id/risk', getEquipmentRisk);

module.exports = router;