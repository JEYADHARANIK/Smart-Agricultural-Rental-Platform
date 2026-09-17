/**
 * Booking / Rental Lifecycle Processor
 *
 * Runs periodically (and once on server boot) to advance the rental lifecycle
 * without requiring a human click for obvious state changes:
 *  - approved + paid booking whose start date has arrived  -> active
 *    (approved + unpaid bookings past start are reminded to pay)
 *  - active booking past its end date                      -> completed
 *  - equipment past/shortly-before maintenance due         -> notify the admins
 *
 * Equipment status is kept in sync (Rented / Available) and customers/admins
 * receive pushed notifications exactly like manual transitions do.
 */

const Booking = require('../models/Booking');
const Equipment = require('../models/Equipment');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendNotification } = require('./notificationService');

const MAINTENANCE_NOTICE_DAYS = 3;

// Dependency holder so tests can inject in-memory fakes (see __setLifecycleDepsForTest).
const liveDeps = {
  Booking,
  Equipment,
  Payment,
  User,
  Notification,
  sendNotification,
};
let deps = liveDeps;

/**
 * Test hook: override the data/notification sources used by the lifecycle.
 * Restore with __setLifecycleDepsForTest() (no args).
 */
function __setLifecycleDepsForTest(overrides = {}) {
  deps = { ...liveDeps, ...overrides };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function advanceBookingLifecycle() {
  const today = startOfToday();
  const results = { started: 0, completed: 0, paymentReminders: 0, maintenanceNotified: 0 };

  // ---- Approved bookings whose start date has arrived --------------------
  const startingBookings = await deps.Booking.find({
    status: 'approved',
    startDate: { $lte: today },
  }).populate('equipment', 'name');

  for (const booking of startingBookings) {
    const paid = await deps.Payment.findOne({ booking: booking._id, paymentStatus: 'paid' });
    if (paid) {
      booking.status = 'active';
      await booking.save();
      await deps.Equipment.findByIdAndUpdate(booking.equipment._id, { status: 'Rented' });
      await deps.sendNotification({
        user: { _id: booking.customer },
        type: 'schedule_change',
        title: 'Rental started',
        message: `Your rental ${booking.bookingNumber} for ${booking.equipment?.name || 'the equipment'} has started today.`,
        data: { bookingId: booking._id, bookingNumber: booking.bookingNumber },
        sendSms: true,
      });
      results.started += 1;
    } else {
      await deps.sendNotification({
        user: { _id: booking.customer },
        type: 'payment_pending',
        title: 'Payment required to start rental',
        message: `Your rental ${booking.bookingNumber} for ${booking.equipment?.name || 'the equipment'} starts today but is not paid yet. Please complete the payment.`,
        data: { bookingId: booking._id, bookingNumber: booking.bookingNumber },
        sendSms: true,
      });
      results.paymentReminders += 1;
    }
  }

  // ---- Active bookings past their end date -> completed --------------------
  const endingBookings = await deps.Booking.find({
    status: 'active',
    endDate: { $lt: today },
  }).populate('equipment', 'name');

  for (const booking of endingBookings) {
    booking.status = 'completed';
    await booking.save();

    const otherActive = await deps.Booking.countDocuments({
      equipment: booking.equipment._id,
      status: { $in: ['active', 'approved'] },
      _id: { $ne: booking._id },
    });
    if (otherActive === 0) {
      const eq = await deps.Equipment.findById(booking.equipment._id);
      if (eq && eq.status === 'Rented') {
        eq.status = 'Available';
        await eq.save();
      }
    }

    await deps.sendNotification({
      user: { _id: booking.customer },
      type: 'system',
      title: 'Rental completed',
      message: `Your rental ${booking.bookingNumber} for ${booking.equipment?.name || 'the equipment'} has ended. Thank you for renting with us!`,
      data: { bookingId: booking._id, bookingNumber: booking.bookingNumber },
      sendSms: true,
    });
    results.completed += 1;
  }

  // ---- Maintenance-due watchdog for admins (once per day per equipment) ----
  const noticeWindowEnd = addDays(today, MAINTENANCE_NOTICE_DAYS);
  const dueEquipment = await deps.Equipment.find({
    nextMaintenanceDue: { $lte: noticeWindowEnd },
  }).select('_id name nextMaintenanceDue');

  const admins = await deps.User.find({ role: 'admin' }).select('_id');

  for (const eq of dueEquipment) {
    const dueLabel = eq.nextMaintenanceDue ? eq.nextMaintenanceDue.toISOString().slice(0, 10) : 'soon';
    const alreadyNotifiedToday = await deps.Notification.findOne({
      user: { $in: admins.map((a) => a._id) },
      type: 'maintenance_due',
      title: `Maintenance due for ${eq.name}`,
      createdAt: { $gte: today },
    });
    if (alreadyNotifiedToday) {
      continue;
    }
    for (const admin of admins) {
      await deps.sendNotification({
        user: { _id: admin._id },
        type: 'maintenance_due',
        title: `Maintenance due for ${eq.name}`,
        message: `Scheduled maintenance for ${eq.name} is due ${dueLabel}.`,
        data: { equipmentId: eq._id },
      });
      results.maintenanceNotified += 1;
    }
  }

  if (results.started || results.completed || results.paymentReminders || results.maintenanceNotified) {
    console.log(
      '[lifecycle] booking lifecycle advanced:',
      `${results.started} started, ${results.completed} completed, ${results.paymentReminders} payment reminders, ${results.maintenanceNotified} maintenance notices`
    );
  }

  return results;
}

const LIFECYCLE_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

function startBookingLifecycle({ runImmediately = true } = {}) {
  if (runImmediately) {
    advanceBookingLifecycle().catch((err) =>
      console.error('[lifecycle] start-up booking lifecycle error:', err?.message || err)
    );
  }
  const timer = setInterval(() => {
    advanceBookingLifecycle().catch((err) =>
      console.error('[lifecycle] booking lifecycle error:', err?.message || err)
    );
  }, LIFECYCLE_INTERVAL_MS);
  // Do not keep the process alive purely for the timer in edge environments.
  timer.unref();
  return timer;
}

module.exports = {
  advanceBookingLifecycle,
  startBookingLifecycle,
  LIFECYCLE_INTERVAL_MS,
  __setLifecycleDepsForTest,
};