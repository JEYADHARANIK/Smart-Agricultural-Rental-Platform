const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add equipment name'],
      trim: true,
      maxlength: [100, 'Equipment name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please add equipment category'],
      enum: {
        values: [
          'Tractors',
          'Harvesters',
          'Tillage & Tilling',
          'Seeding & Planting',
          'Irrigation',
          'Haulage',
          'Other',
        ],
        message: '{VALUE} is not a valid equipment category',
      },
      default: 'Tractors',
    },
    description: {
      type: String,
      required: [true, 'Please add equipment description'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    dailyRate: {
      type: Number,
      required: [true, 'Please add daily rental rate'],
      min: [0, 'Daily rate must be a non-negative number'],
    },
    status: {
      type: String,
      required: [true, 'Please specify operational status'],
      enum: {
        values: ['Available', 'Rented', 'Maintenance'],
        message: '{VALUE} is not a valid equipment status',
      },
      default: 'Available',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Equipment', equipmentSchema);
