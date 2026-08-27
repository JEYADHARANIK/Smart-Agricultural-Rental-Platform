const mongoose = require('mongoose');
const Equipment = require('../models/Equipment');

// @desc    Get all equipment (with optional filters)
// @route   GET /api/equipment
// @access  Public
const getEquipment = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const equipment = await Equipment.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: equipment.length,
      equipment,
    });
  } catch (error) {
    console.error('Get equipment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving equipment',
    });
  }
};

// @desc    Get single equipment by ID
// @route   GET /api/equipment/:id
// @access  Public
const getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid equipment ID format',
      });
    }

    const equipment = await Equipment.findById(id).populate('createdBy', 'name email');

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment machine not found',
      });
    }

    return res.status(200).json({
      success: true,
      equipment,
    });
  } catch (error) {
    console.error('Get equipment by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving equipment details',
    });
  }
};

// @desc    Create new equipment machine
// @route   POST /api/equipment
// @access  Private/Admin
const createEquipment = async (req, res) => {
  try {
    const { name, category, description, dailyRate, status, location, imageUrl } = req.body;

    if (!name || !description || dailyRate === undefined || dailyRate === null) {
      return res.status(400).json({
        success: false,
        message: 'Please provide required fields: name, description, and dailyRate',
      });
    }

    const parsedRate = Number(dailyRate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      return res.status(400).json({
        success: false,
        message: 'dailyRate must be a non-negative number',
      });
    }

    const equipment = await Equipment.create({
      name,
      category: category || 'Tractors',
      description,
      dailyRate: parsedRate,
      status: status || 'Available',
      location: location || '',
      imageUrl: imageUrl || '',
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Equipment created successfully',
      equipment,
    });
  } catch (error) {
    console.error('Create equipment error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating equipment',
    });
  }
};

// @desc    Update existing equipment machine
// @route   PUT /api/equipment/:id
// @access  Private/Admin
const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid equipment ID format',
      });
    }

    let equipment = await Equipment.findById(id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment machine not found',
      });
    }

    if (req.body.dailyRate !== undefined) {
      const parsedRate = Number(req.body.dailyRate);
      if (isNaN(parsedRate) || parsedRate < 0) {
        return res.status(400).json({
          success: false,
          message: 'dailyRate must be a non-negative number',
        });
      }
      req.body.dailyRate = parsedRate;
    }

    // Do not allow overriding createdBy from client body
    delete req.body.createdBy;

    equipment = await Equipment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Equipment updated successfully',
      equipment,
    });
  } catch (error) {
    console.error('Update equipment error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating equipment',
    });
  }
};

// @desc    Delete equipment machine
// @route   DELETE /api/equipment/:id
// @access  Private/Admin
const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid equipment ID format',
      });
    }

    const equipment = await Equipment.findById(id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment machine not found',
      });
    }

    await equipment.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Equipment deleted successfully',
    });
  } catch (error) {
    console.error('Delete equipment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting equipment',
    });
  }
};

module.exports = {
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
};
