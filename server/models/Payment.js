const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Please provide a booking ID'],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a customer ID'],
    },
    amount: {
      type: Number,
      required: [true, 'Please provide a payment amount'],
      min: [0, 'Payment amount must be a non-negative number'],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Please specify a payment method'],
      enum: {
        values: [
          'UPI / Mobile Wallet',
          'Credit/Debit Card',
          'Net Banking',
          'Cash on Delivery',
        ],
        message: '{VALUE} is not a supported payment method',
      },
      default: 'UPI / Mobile Wallet',
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'paid', 'failed', 'refunded'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'paid',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Admin notes cannot exceed 300 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookups by booking, customer, and transaction number
paymentSchema.index({ booking: 1, paymentStatus: 1 });
paymentSchema.index({ customer: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
