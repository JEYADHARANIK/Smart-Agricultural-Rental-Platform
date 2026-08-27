const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: [true, 'Please provide an equipment ID'],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a customer ID'],
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide a start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide an end date'],
    },
    totalDays: {
      type: Number,
      required: true,
      min: [1, 'Total days must be at least 1'],
    },
    dailyRate: {
      type: Number,
      required: true,
      min: [0, 'Daily rate must be a non-negative number'],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price must be a non-negative number'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid booking status',
      },
      default: 'pending',
    },
    adminRemarks: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Admin remarks cannot exceed 300 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient overlap queries
bookingSchema.index({ equipment: 1, status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
