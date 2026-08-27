const express = require('express');
const router = express.Router();
const {
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} = require('../controllers/equipmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public routes
router.get('/', getEquipment);
router.get('/:id', getEquipmentById);

// Admin-only protected routes
router.post('/', protect, authorize('admin'), createEquipment);
router.put('/:id', protect, authorize('admin'), updateEquipment);
router.delete('/:id', protect, authorize('admin'), deleteEquipment);

module.exports = router;
