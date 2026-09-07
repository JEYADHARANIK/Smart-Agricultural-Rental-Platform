const mongoose = require('mongoose');
const User = require('../models/User');

// @desc    Get all registered customers (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' })
      .select('_id name email phone location address role createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving customer directory',
    });
  }
};

// @desc    Get a single customer by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format',
      });
    }

    // Only allow fetching accounts with role 'customer'
    const customer = await User.findOne({ _id: id, role: 'customer' }).select(
      '_id name email phone location address role createdAt'
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    return res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving customer details',
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
};
