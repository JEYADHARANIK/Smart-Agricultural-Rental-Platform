const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: '',
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
    // Weather-aware smart scheduling snapshot captured at booking creation
    weatherSlot: {
      classification: {
        type: String,
        enum: ['BEST', 'USABLE', 'NOT RECOMMENDED', 'UNKNOWN'],
        default: 'UNKNOWN',
      },
      summary: { type: String, default: '' },
      reasons: [{ type: String }],
      checkedAt: { type: Date, default: null },
    },
    // Billing breakdown (validated server-side)
    billing: {
      baseAmount: { type: Number, default: 0 },
      transportCharge: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      finalAmount: { type: Number, default: 0 },
    },
    transportNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient overlap queries
bookingSchema.index({ equipment: 1, status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
