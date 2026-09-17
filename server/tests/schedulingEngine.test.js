const { test, after } = require('node:test');
const assert = require('node:assert');
const {
  normalizeDate,
  dayKey,
  buildCandidateSlots,
  evaluateWeather,
  evaluateLocation,
  evaluateMaintenance,
  evaluateSlot,
  recommendAlternatives,
  runSlotAnalysis,
  __setBookingModelForTest,
} = require('../utils/schedulingEngine');

// Restore the real booking model after all tests in this file.
after(() => {
  __setBookingModelForTest(require('../models/Booking'));
});

const DAY = 1000 * 60 * 60 * 24;

const equipment = (overrides = {}) => ({
  _id: 'EQ1',
  name: 'Machine A',
  category: 'Tractors',
  location: 'Coimbatore',
  status: 'Available',
  coordinates: { lat: 10.9, lng: 76.9 },
  nextMaintenanceDue: null,
  ...overrides,
});

const forecastFor = (entries) => ({ available: true, daily: entries });

const dayEntry = (date, extra = {}) => ({
  date: new Date(date).toISOString(),
  rainProbability: 20,
  precipitation: 0,
  conditionMain: 'Clear',
  severe: false,
  ...extra,
});

// Minimal fake booking model mirroring the query shape used by the engine.
function makeBookingModel(rows) {
  return {
    find(query) {
      return {
        lean: async () =>
          rows.filter((row) => {
            if (query.equipment && String(row.equipment) !== String(query.equipment)) return false;
            if (query.status && Array.isArray(query.status) && !query.status.includes(row.status)) return false;
            if (query._id && query._id.$ne && String(row._id) === String(query._id.$ne)) return false;
            const start = new Date(row.startDate);
            const end = new Date(row.endDate);
            if (query.startDate && query.startDate.$lte && !(start <= new Date(query.startDate.$lte))) return false;
            if (query.endDate && query.endDate.$gte && !(end >= new Date(query.endDate.$gte))) return false;
            return true;
          }),
      };
    },
  };
}

test('scheduling: normalizeDate and dayKey are timezone-consistent', () => {
  const d = normalizeDate('2026-01-05T14:30:00Z');
  assert.strictEqual(d.getHours(), 0);
  assert.strictEqual(d.getMinutes(), 0);
  assert.strictEqual(dayKey(d), dayKey(new Date(d)));
});

test('scheduling: buildCandidateSlots produces whole-day consecutive slots', () => {
  const start = normalizeDate('2026-01-05');
  const slots = buildCandidateSlots(start, 2, 14);
  assert.strictEqual(slots.length, 14);
  againstFirst: {
    const first = slots[0];
    const end = new Date(first.end);
    const second = slots[1];
    assert.strictEqual(end.getTime() - first.start.getTime(), (2 - 1) * DAY);
    assert.strictEqual(second.start.getTime() - first.start.getTime(), DAY);
  }
});

test('scheduling: evaluateWeather returns UNKNOWN when forecast unavailable', () => {
  const result = evaluateWeather({ available: false, reason: 'no key' }, { start: new Date('2026-01-05'), end: new Date('2026-01-05') });
  assert.strictEqual(result.classification, 'UNKNOWN');
  assert.ok(result.summary.length > 0);
  assert.ok(Array.isArray(result.reasons) && result.reasons.length > 0);
});

test('scheduling: evaluateWeather picks the worst day across a slot', () => {
  const slot = { start: new Date('2026-01-05T00:00:00Z'), end: new Date('2026-01-06T00:00:00Z') };
  const forecast = forecastFor([
    dayEntry('2026-01-05T00:00:00Z'),
    dayEntry('2026-01-06T00:00:00Z', { rainProbability: 90 }),
  ]);
  const result = evaluateWeather(forecast, slot);
  assert.strictEqual(result.classification, 'NOT RECOMMENDED');
});

test('scheduling: evaluateWeather returns UNKNOWN when no day coverage', () => {
  const slot = { start: new Date('2026-01-05T00:00:00Z'), end: new Date('2026-01-05T00:00:00Z') };
  const result = evaluateWeather(forecastFor([dayEntry('2026-01-20T00:00:00Z')]), slot);
  assert.strictEqual(result.classification, 'UNKNOWN');
});

test('scheduling: evaluateLocation uses haversine when both coordinates exist', () => {
  const result = evaluateLocation(
    { location: 'A', coordinates: { lat: 10, lng: 76 } },
    'B',
    { lat: 10.5, lng: 76.5 }
  );
  assert.strictEqual(result.suitable, true);
  assert.strictEqual(typeof result.distanceKm, 'number');
  assert.ok(result.distanceKm > 0);
});

test('scheduling: evaluateLocation matches same-area text locations', () => {
  const result = evaluateLocation({ location: 'Coimbatore' }, 'coimbatore');
  assert.strictEqual(result.suitable, true);
  assert.ok(/same area/i.test(result.reason));
});

test('scheduling: evaluateLocation never fabricates distance without coordinates', () => {
  const result = evaluateLocation({ location: 'Erode' }, 'Salem');
  assert.strictEqual(result.distanceKm, undefined);
  assert.strictEqual(result.suitable, true);
});

test('scheduling: maintenance restriction marks slot as maintenance_restricted', async () => {
  __setBookingModelForTest(makeBookingModel([]));
  const slot = { start: new Date('2026-01-05T00:00:00Z'), end: new Date('2026-01-05T00:00:00Z') };
  const eq = equipment({ status: 'Available', nextMaintenanceDue: new Date('2026-01-05T00:00:00Z') });
  const result = await evaluateSlot(eq, slot, { customerLocation: 'Coimbatore', customerCoordinates: null, dailyForecast: null });
  assert.strictEqual(result.available, false);
  assert.strictEqual(result.status, 'maintenance_restricted');
});

test('scheduling: booking conflict marks slot unavailable', async () => {
  __setBookingModelForTest(
    makeBookingModel([
      { _id: 'B1', equipment: 'EQ1', status: 'approved', startDate: new Date('2026-01-04'), endDate: new Date('2026-01-06') },
    ])
  );
  const slot = { start: new Date('2026-01-05T00:00:00Z'), end: new Date('2026-01-05T00:00:00Z') };
  const result = await evaluateSlot(equipment(), slot, { customerLocation: 'Coimbatore', customerCoordinates: null, dailyForecast: null });
  assert.strictEqual(result.available, false);
  assert.strictEqual(result.status, 'unavailable');
});

test('scheduling: free slot with good weather is available and BEST', async () => {
  __setBookingModelForTest(makeBookingModel([]));
  const slot = { start: new Date('2026-01-05T00:00:00Z'), end: new Date('2026-01-05T00:00:00Z') };
  const dailyForecast = forecastFor([dayEntry('2026-01-05T00:00:00Z')]);
  const result = await evaluateSlot(equipment(), slot, { customerLocation: 'Coimbatore', customerCoordinates: null, dailyForecast });
  assert.strictEqual(result.available, true);
  assert.strictEqual(result.classification, 'BEST');
  assert.strictEqual(result.status, 'available');
});

test('scheduling: recommendAlternatives excludes the exact requested slot', async () => {
  __setBookingModelForTest(makeBookingModel([]));
  const start = normalizeDate('2026-01-05');
  const context = {
    customerLocation: 'Coimbatore',
    customerCoordinates: null,
    requestedStart: start,
    requestedDuration: 1,
    dailyForecast: forecastFor([dayEntry('2026-01-06T00:00:00Z', { rainProbability: 30 })]),
  };
  const results = await recommendAlternatives([equipment()], context, { maxResults: 5 });
  assert.ok(results.length > 0);
  assert.strictEqual(results[0].available, true);
  assert.notStrictEqual(results[0].slot.start.getTime(), start.getTime());
});

test('scheduling: runSlotAnalysis ok when free and BEST', async () => {
  __setBookingModelForTest(makeBookingModel([]));
  const analysis = await runSlotAnalysis({
    equipment: equipment(),
    customerLocation: 'Coimbatore',
    customerCoordinates: null,
    requestedStart: normalizeDate('2026-01-05'),
    requestedDuration: 1,
    dailyForecast: forecastFor([dayEntry('2026-01-05T00:00:00Z')]),
  });
  assert.strictEqual(analysis.recommendation, 'ok');
  assert.strictEqual(analysis.requestedSlot.available, true);
});

test('scheduling: runSlotAnalysis alternatives_required when blocked', async () => {
  __setBookingModelForTest(
    makeBookingModel([
      {
        _id: 'B1',
        equipment: 'EQ1',
        status: 'approved',
        startDate: normalizeDate('2026-01-05'),
        endDate: normalizeDate('2026-01-05'),
      },
    ])
  );
  const analysis = await runSlotAnalysis({
    equipment: equipment(),
    customerLocation: 'Coimbatore',
    customerCoordinates: null,
    requestedStart: normalizeDate('2026-01-05'),
    requestedDuration: 1,
    dailyForecast: forecastFor([dayEntry('2026-01-05T00:00:00Z')]),
  });
  assert.strictEqual(analysis.recommendation, 'alternatives_required');
  assert.strictEqual(analysis.requestedSlot.available, false);
});

test('scheduling: runSlotAnalysis recommends alternatives on poor weather', async () => {
  __setBookingModelForTest(makeBookingModel([]));
  const analysis = await runSlotAnalysis({
    equipment: equipment(),
    customerLocation: 'Coimbatore',
    customerCoordinates: null,
    requestedStart: normalizeDate('2026-01-05'),
    requestedDuration: 1,
    dailyForecast: forecastFor([dayEntry('2026-01-05T00:00:00Z', { rainProbability: 95 })]),
  });
  assert.strictEqual(analysis.recommendation, 'alternatives_recommended');
  assert.strictEqual(analysis.requestedSlot.available, true);
});