const { test, after } = require('node:test');
const assert = require('node:assert');
const {
  advanceBookingLifecycle,
  __setLifecycleDepsForTest,
} = require('../utils/bookingLifecycle');

// Restore real dependencies after all tests in this file.
after(() => {
  __setLifecycleDepsForTest();
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function at(daysFromToday) {
  const d = startOfToday();
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

const doc = (obj) => ({
  ...obj,
  save() {
    return Promise.resolve(this);
  },
});

function makeStore() {
  const bookings = [];
  const payments = [];
  const equipmentList = [];
  const users = [];
  const notifications = [];
  let notifiedCalls = [];

  function getField(row, key) {
    let val = row[key];
    if (val && typeof val === 'object' && (key === 'equipment' || key === 'customer') && val._id) {
      val = val._id;
    }
    return val;
  }

  function matchRow(row, query) {
    for (const [key, value] of Object.entries(query || {})) {
      const field = getField(row, key);
      if (field === undefined) return false;
      if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
        if (value.$lte !== undefined && !(field <= value.$lte)) return false;
        if (value.$gte !== undefined && !(field >= value.$gte)) return false;
        if (value.$lt !== undefined && !(field < value.$lt)) return false;
        if (value.$ne !== undefined && String(field) === String(value.$ne)) return false;
        if (Array.isArray(value.$in) && !value.$in.includes(field)) return false;
      } else if (String(field) !== String(value)) {
        return false;
      }
    }
    return true;
  }

  const queryBuilder = (rows, query) => ({
    populate() {
      return this;
    },
    select() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(rows.filter((r) => matchRow(r, query))).then(resolve, reject);
    },
  });

  const BookingModel = {
    find(query) {
      return queryBuilder(bookings, query);
    },
    countDocuments(query) {
      return Promise.resolve(bookings.filter((r) => matchRow(r, query)).length);
    },
  };
  const PaymentModel = {
    findOne(query) {
      const hit = payments.find((r) => matchRow(r, query));
      return Promise.resolve(hit || null);
    },
  };
  const EquipmentModel = {
    find(query) {
      return queryBuilder(equipmentList, query);
    },
    findById(id) {
      const hit = equipmentList.find((e) => String(e._id) === String(id));
      return Promise.resolve(hit || null);
    },
    findByIdAndUpdate(id, update) {
      const hit = equipmentList.find((e) => String(e._id) === String(id));
      if (hit) Object.assign(hit, update);
      return Promise.resolve(hit);
    },
  };
  const UserModel = {
    find(query) {
      return queryBuilder(users, query);
    },
  };
  const NotificationModel = {
    findOne(query) {
      const hit = notifications.find((r) => matchRow(r, query));
      return Promise.resolve(hit || null);
    },
  };
  const notifySpy = async (opts) => {
    notifiedCalls.push(opts);
  };

  const deps = {
    Booking: BookingModel,
    Equipment: EquipmentModel,
    Payment: PaymentModel,
    User: UserModel,
    Notification: NotificationModel,
    sendNotification: notifySpy,
  };

  return {
    deps,
    store: { bookings, payments, equipmentList, users, notifications },
    calls: () => notifiedCalls,
  };
}

test('lifecycle: approved + paid booking reaching its start date becomes active and marks equipment Rented', async () => {
  const s = makeStore();
  __setLifecycleDepsForTest(s.deps);

  s.store.bookings.push(
    doc({
      _id: 'B1',
      bookingNumber: 'BK-1',
      status: 'approved',
      customer: 'C1',
      startDate: at(0),
      endDate: at(2),
      equipment: { _id: 'EQ1', name: 'Machine A' },
    })
  );
  s.store.payments.push({ booking: 'B1', paymentStatus: 'paid' });
  s.store.equipmentList.push(doc({ _id: 'EQ1', name: 'Machine A', status: 'Available' }));

  const results = await advanceBookingLifecycle();

  assert.strictEqual(results.started, 1);
  assert.strictEqual(s.store.bookings[0].status, 'active');
  assert.strictEqual(s.store.equipmentList[0].status, 'Rented');
  const startedNotif = s.calls().find((n) => n.type === 'schedule_change');
  assert.ok(startedNotif, 'expected a scheduled-start notification');
  assert.strictEqual(startedNotif.user._id, 'C1');
});

test('lifecycle: approved + unpaid booking past start date sends a payment reminder and stays approved', async () => {
  const s = makeStore();
  __setLifecycleDepsForTest(s.deps);

  s.store.bookings.push(
    doc({
      _id: 'B2',
      bookingNumber: 'BK-2',
      status: 'approved',
      customer: 'C1',
      startDate: at(0),
      endDate: at(2),
      equipment: { _id: 'EQ2', name: 'Machine B' },
    })
  );
  s.store.equipmentList.push(doc({ _id: 'EQ2', name: 'Machine B', status: 'Available' }));

  const results = await advanceBookingLifecycle();

  assert.strictEqual(results.paymentReminders, 1);
  assert.strictEqual(results.started, 0);
  assert.strictEqual(s.store.bookings[0].status, 'approved');
  assert.ok(s.calls().some((n) => n.type === 'payment_pending'));
});

test('lifecycle: active booking past its end date completes and frees the equipment', async () => {
  const s = makeStore();
  __setLifecycleDepsForTest(s.deps);

  s.store.bookings.push(
    doc({
      _id: 'B3',
      bookingNumber: 'BK-3',
      status: 'active',
      customer: 'C1',
      startDate: at(-5),
      endDate: at(-1),
      equipment: { _id: 'EQ3', name: 'Machine C' },
    })
  );
  s.store.equipmentList.push(doc({ _id: 'EQ3', name: 'Machine C', status: 'Rented' }));

  const results = await advanceBookingLifecycle();

  assert.strictEqual(results.completed, 1);
  assert.strictEqual(s.store.bookings[0].status, 'completed');
  assert.strictEqual(s.store.equipmentList[0].status, 'Available');
  assert.ok(s.calls().some((n) => n.type === 'system'));
});

test('lifecycle: maintenance-due watchdog notifies every admin once per day', async () => {
  const s = makeStore();
  __setLifecycleDepsForTest(s.deps);

  s.store.equipmentList.push(doc({ _id: 'EQ4', name: 'Machine D', nextMaintenanceDue: at(1), status: 'Available' }));
  s.store.users.push({ _id: 'A1', role: 'admin' });
  s.store.users.push({ _id: 'A2', role: 'admin' });

  const firstRun = await advanceBookingLifecycle();
  assert.strictEqual(firstRun.maintenanceNotified, 2);
  const dueNotifs = s.calls().filter((n) => n.type === 'maintenance_due');
  assert.strictEqual(dueNotifs.length, 2);
  assert.deepStrictEqual(new Set(dueNotifs.map((n) => n.user._id)), new Set(['A1', 'A2']));

  // Already notified today -> no duplicates on the next run.
  s.store.notifications.push(
    doc({ user: 'A1', type: 'maintenance_due', title: 'Maintenance due for Machine D', createdAt: startOfToday() })
  );
  const secondRun = await advanceBookingLifecycle();
  assert.strictEqual(secondRun.maintenanceNotified, 0);
});