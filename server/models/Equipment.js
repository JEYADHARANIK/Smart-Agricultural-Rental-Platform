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
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    // Maintenance & usage tracking
    usageHours: {
      type: Number,
      default: 0,
      min: [0, 'Usage hours cannot be negative'],
    },
    lastMaintenanceDate: {
      type: Date,
      default: null,
    },
    maintenanceIntervalDays: {
      type: Number,
      default: 90,
      min: [1, 'Maintenance interval must be at least 1 day'],
    },
    nextMaintenanceDue: {
      type: Date,
      default: null,
    },
    maintenanceType: {
      type: String,
      trim: true,
      default: '',
    },
    maintenanceNotes: {
      type: String,
      trim: true,
      default: '',
    },
    maintenanceHistory: [
      {
        date: { type: Date, required: true },
        type: { type: String, default: '' },
        notes: { type: String, default: '' },
        usageHoursAtService: { type: Number, default: 0 },
      },
    ],
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
