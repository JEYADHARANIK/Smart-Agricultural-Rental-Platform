/**
 * Notification service: creates in-app notifications and optionally sends SMS.
 * Guards against duplicate notifications by type+title within a few minutes.
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const smsService = require('./smsService');

const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

async function sendNotification({
  user,
  type,
  title,
  message,
  data = {},
  sendSms = false,
  smsBody = null,
}) {
  const results = { notification: null, sms: null };

  if (user) {
    try {
      // Duplicate guard
      const dupWindow = new Date(Date.now() - DUPLICATE_WINDOW_MS);
      const existing = await Notification.findOne({
        user: user._id,
        type,
        title,
        createdAt: { $gte: dupWindow },
      });

      if (!existing) {
        const notification = await Notification.create({
          user: user._id,
          type,
          title,
          message,
          data,
        });
        results.notification = notification;
      }
    } catch (error) {
      console.error('Notification creation error:', error?.message || error);
    }
  }

  if (sendSms && user) {
    let phone = user.phone;
    // Never trust a caller-supplied phone (admins pass their own device). Resolve from DB.
    if (!phone) {
      try {
        const recipient = await User.findById(user._id).select('phone');
        phone = recipient && recipient.phone;
      } catch (error) {
        console.error('SMS phone lookup error:', error?.message || error);
      }
    }

    if (phone) {
      const cleanPhone = String(phone).replace(/[^+\d]/g, '');
      const body = smsBody || message;
      results.sms = await smsService.sendSms({ to: cleanPhone, body });
    }
  }

  return results;
}

module.exports = { sendNotification, DUPLICATE_WINDOW_MS };