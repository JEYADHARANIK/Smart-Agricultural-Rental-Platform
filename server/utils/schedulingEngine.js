/**
 * Smart Scheduling Engine
 *
 * A transparent rule/constraint-based decision engine for rental slot evaluation.
 * It checks:
 *  - Equipment availability (existing bookings)
 *  - Maintenance restrictions
 *  - Weather suitability (real weather data via weatherService)
 *  - Location suitability (coordinates or text-based heuristic)
 *
 * The engine ranks alternative slots and always provides human-readable
 * explanations. The architecture is intentionally structured so a trained ML
 * model could later replace the scoring layer without touching the API surface.
 */

const Booking = require('../models/Booking');
const { classifyDay } = require('./weatherService');

const SLOT_RANK = { 'BEST': 3, 'USABLE': 2, 'NOT RECOMMENDED': 1, 'UNKNOWN': 0 };

// Booking model holder. Production code uses the real model; tests inject a
// lightweight fake so slot availability can be verified without a database.
let bookingModel = Booking;

/**
 * Test hook: override the booking data source used for conflict queries.
 * Restore with __setBookingModelForTest(require('../models/Booking')).
 */
function __setBookingModelForTest(model) {
  bookingModel = model || Booking;
}

/**
 * Convert a date to start-of-day UTC Date.
 */
function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(date) {
  return normalizeDate(date).toISOString();
}

/**
 * Compute candidate slots for an equipment + duration window.
 * Slots are measured in whole days (consistent with booking model).
 */
function buildCandidateSlots(startDate, totalDays, maxAlternatives = 14) {
  const start = normalizeDate(startDate);
  const candidates = [];
  for (let offset = 0; offset < maxAlternatives; offset++) {
    const slotStart = new Date(start);
    slotStart.setDate(slotStart.getDate() + offset);
    const slotEnd = new Date(slotStart);
    slotEnd.setDate(slotEnd.getDate() + totalDays - 1);
    candidates.push({ start: slotStart, end: slotEnd });
  }
  return candidates;
}

/**
 * Check whether an equipment is free for a given slot against existing bookings.
 */
async function getConflicts(equipmentId, start, end, excludedBookingId = null) {
  const query = {
    equipment: equipmentId,
    status: { $in: ['pending', 'approved', 'active'] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  };
  if (excludedBookingId) {
    query._id = { $ne: excludedBookingId };
  }
  return bookingModel.find(query).lean();
}

/**
 * Human-readable "available vs conflict" evaluation for a slot.
 */
async function evaluateAvailability(equipment, slot, excludedBookingId = null) {
  const conflicts = await getConflicts(equipment._id, slot.start, slot.end, excludedBookingId);
  if (conflicts.length > 0) {
    const ids = conflicts.map((c) => c.bookingNumber).join(', ');
    return {
      available: false,
      reason: `Already reserved (${ids}) during this period.`,
    };
  }
  return { available: true, reason: 'Equipment is free for these dates.' };
}

/**
 * Evaluate maintenance restrictions for a slot.
 */
function evaluateMaintenance(equipment, slot) {
  if (equipment.status === 'Maintenance') {
    return {
      restriction: true,
      reason: 'Equipment is currently under maintenance and cannot be booked.',
    };
  }
  if (equipment.nextMaintenanceDue) {
    const due = normalizeDate(equipment.nextMaintenanceDue);
    // If the requested slot overlaps the maintenance date window (+3 days buffer), flag it.
    const bufferEnd = new Date(due);
    bufferEnd.setDate(bufferEnd.getDate() + 3);
    if (slot.start <= bufferEnd && slot.end >= due) {
      return {
        restriction: true,
        reason: `Scheduled maintenance is due ${due.toISOString().slice(0, 10)}.`,
      };
    }
  }
  return { restriction: false, reason: 'No maintenance restrictions on this slot.' };
}

/**
 * Evaluate weather suitability for a slot using real forecast data.
 * @param dailyForecast array from weatherService.getForecast()
 */
function evaluateWeather(dailyForecast, slot) {
  if (!dailyForecast || !dailyForecast.available) {
    return {
      classification: 'UNKNOWN',
      summary: 'Weather forecast is currently unavailable. Proceeding without weather adjustment.',
      reasons: ['Weather forecast is currently unavailable.'],
    };
  }

  const startKey = dayKey(slot.start);
  const endKey = dayKey(slot.end);
  const dayEntries = (dailyForecast.daily || []).filter(
    (d) => dayKey(d.date) >= startKey && dayKey(d.date) <= endKey
  );

  if (dayEntries.length === 0) {
    return {
      classification: 'UNKNOWN',
      summary: 'No forecast coverage for this date range.',
      reasons: ['No forecast coverage for this date range.'],
    };
  }

  // Rank worst-case classification across all days in the slot
  let worst = 'BEST';
  let allReasons = [];
  for (const entry of dayEntries) {
    const cls = classifyDay(entry);
    allReasons = allReasons.concat(cls.reasons.map((r) => `${dayKey(entry.date).slice(0, 10)}: ${r}`));
    if (SLOT_RANK[cls.classification] < SLOT_RANK[worst]) {
      worst = cls.classification;
    }
  }

  const messageByClass = {
    'BEST': 'Best slot — low probability of rain and favorable conditions.',
    'USABLE': 'Usable slot — moderate weather risk. Work can proceed with caution.',
    'NOT RECOMMENDED': 'Not recommended — high probability of rain during the requested period.',
  };

  return {
    classification: worst,
    summary: messageByClass[worst] || 'Weather conditions are unknown.',
    reasons: allReasons,
  };
}

/**
 * Evaluate location suitability.
 * Equipment and customer location are text currently, with optional coordinates.
 * When coordinates exist for both, a distance metric is computed.
 * Otherwise a lightweight text-match heuristic is used. This never fabricates GPS data.
 */
function evaluateLocation(equipment, customerLocation, customerCoordinates = null) {
  const eqCoords =
    equipment.coordinates && equipment.coordinates.lat != null && equipment.coordinates.lng != null
      ? equipment.coordinates
      : null;

  if (eqCoords && customerCoordinates && customerCoordinates.lat != null && customerCoordinates.lng != null) {
    const distKm = haversineKm(eqCoords, customerCoordinates);
    return {
      distanceKm: Math.round(distKm * 10) / 10,
      reason: `Approximately ${Math.round(distKm)} km from the customer location.`,
      suitable: true,
    };
  }

  if (equipment.location && customerLocation) {
    const eq = equipment.location.toLowerCase();
    const cust = customerLocation.toLowerCase();
    if (eq.includes(cust) || cust.includes(eq)) {
      return { reason: 'Equipment is located in the same area as the customer.', suitable: true };
    }
    return {
      reason: `Equipment is based in "${equipment.location}"; customer location is "${customerLocation}".`,
      suitable: true,
    };
  }

  return { reason: 'Location data is incomplete; scheduling proceeds on availability.', suitable: true };
}

/**
 * Compute haversine distance between two points in km.
 */
function haversineKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Full evaluation of one slot for one equipment.
 */
async function evaluateSlot(equipment, slot, context) {
  const maintenance = evaluateMaintenance(equipment, slot);
  if (maintenance.restriction) {
    return {
      slot: { start: slot.start, end: slot.end },
      available: false,
      maintenance: maintenance,
      weather: null,
      classification: 'NOT RECOMMENDED',
      score: 0,
      reasons: [maintenance.reason],
      status: 'maintenance_restricted',
    };
  }

  const availability = await evaluateAvailability(equipment, slot, context.excludedBookingId);
  if (!availability.available) {
    return {
      slot: { start: slot.start, end: slot.end },
      available: false,
      availability,
      weather: null,
      classification: 'NOT RECOMMENDED',
      score: 0,
      reasons: [availability.reason],
      status: 'unavailable',
    };
  }

  const weatherResult = evaluateWeather(context.dailyForecast, slot);
  const locationResult = evaluateLocation(
    equipment,
    context.customerLocation,
    context.customerCoordinates
  );

  const reasons = [availability.reason, locationResult.reason];
  if (weatherResult.reasons && weatherResult.reasons.length) {
    reasons.push(...weatherResult.reasons);
  }
  if (weatherResult.summary) {
    reasons.push(weatherResult.summary);
  }

  // Rule-based composite score (0-100). Weather is the dominant factor for
  // farming operations; availability & maintenance constraints gate eligibility above.
  let score = SLOT_RANK[weatherResult.classification] / 3 * 100; // 0, 33, 66, 100

  if (context.excludedBookingId && slot.start.getTime() === slot.end.getTime()) {
    // no-op, kept for clarity
  }

  return {
    slot: { start: slot.start, end: slot.end },
    available: true,
    availability,
    maintenance,
    weather: weatherResult,
    location: locationResult,
    classification: weatherResult.classification,
    score: Math.round(score),
    reasons,
    status: 'available',
  };
}

/**
 * Find alternative slots across a set of equipment, ranked.
 * Prefer BEST > USABLE > NOT RECOMMENDED while always honoring availability
 * and maintenance constraints.
 */
async function recommendAlternatives(equipmentItems, context, { maxResults = 5 } = {}) {
  const results = [];
  for (const equipment of equipmentItems) {
    const candidates = buildCandidateSlots(context.requestedStart, context.requestedDuration);
    // only suggest slots that are not the exact requested slot to avoid duplicates
    const startKey = normalizeDate(context.requestedStart).toISOString();
    for (const slot of candidates) {
      if (dayKey(slot.start) === startKey) continue;
      const evaluated = await evaluateSlot(equipment, slot, context);
      results.push({
        equipmentId: equipment._id,
        equipmentName: equipment.name,
        ...evaluated,
      });
    }
  }

  // Sort: available first, then classification rank, then score
  results.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    const rankDiff = (SLOT_RANK[b.classification] || 0) - (SLOT_RANK[a.classification] || 0);
    if (rankDiff !== 0) return rankDiff;
    return (b.score || 0) - (a.score || 0);
  });

  return results.slice(0, maxResults);
}

/**
 * Full pipeline used by the scheduler API.
 */
async function runSlotAnalysis({ equipment, customerLocation, customerCoordinates, requestedStart, requestedDuration, dailyForecast, excludedBookingId }) {
  const start = normalizeDate(requestedStart);
  const requestSlot = { start, end: (() => { const e = new Date(start); e.setDate(e.getDate() + requestedDuration - 1); return e; })() };

  const context = {
    customerLocation,
    customerCoordinates,
    requestedStart: start,
    requestedDuration,
    dailyForecast,
    excludedBookingId,
  };

  const requestedEvaluation = await evaluateSlot(equipment, requestSlot, context);
  const alternatives = await recommendAlternatives([equipment], context);

  let recommendation = 'ok';
  if (!requestedEvaluation.available) {
    recommendation = 'alternatives_required';
  } else if (requestedEvaluation.classification === 'NOT RECOMMENDED') {
    recommendation = 'alternatives_recommended';
  }

  return {
    equipment: {
      _id: equipment._id,
      name: equipment.name,
      category: equipment.category,
      location: equipment.location,
      status: equipment.status,
    },
    requestedSlot: {
      start: requestSlot.start,
      end: requestSlot.end,
      ...requestedEvaluation,
    },
    alternatives: alternatives.filter((a) => a.available),
    recommendation,
  };
}

module.exports = {
  runSlotAnalysis,
  recommendAlternatives,
  evaluateSlot,
  evaluateWeather,
  evaluateLocation,
  evaluateMaintenance,
  classifyDay,
  buildCandidateSlots,
  normalizeDate,
  dayKey,
  __setBookingModelForTest,
};