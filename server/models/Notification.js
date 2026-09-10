const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'booking_submitted',
        'booking_approved',
        'booking_rejected',
        'booking_reminder',
        'booking_cancelled',
        'payment_pending',
        'payment_success',
        'payment_refunded',
        'maintenance_due',
        'weather_warning',
        'schedule_change',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Avoid duplicate identical notifications for the same user+type+title within a short window
notificationSchema.index({ user: 1, type: 1, title: 1, createdAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);