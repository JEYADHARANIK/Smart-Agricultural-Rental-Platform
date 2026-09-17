/**
 * Deterministic evaluation of the platform's intelligent decision support.
 *
 * Runs the SAME code paths the app uses (rule-based / deterministic fallbacks)
 * against fixed scenarios and prints the decision + reason for each. No AI
 * service is called and no metrics are fabricated or extrapolated.
 *
 * Usage: npm run evaluate
 * Exit code 0 when every scenario passes, 1 otherwise.
 */

const { classifyDay } = require('../utils/weatherService');
const { computeRisk } = require('../utils/maintenanceRisk');
const { buildFallbackReply } = require('../services/farmerAssistant');
const { ruleBasedRecommend } = require('../services/recommendationEngine');
const { getCapabilities } = require('../services/intelligenceService');
const {
  __setBookingModelForTest,
  evaluateWeather,
  runSlotAnalysis,
} = require('../utils/schedulingEngine');

const results = [];

async function check(name, detail, fn) {
  try {
    const extra = await fn();
    const extraLine = extra ? ` -> ${extra}` : '';
    results.push({ name, pass: true, detail: `${detail}${extraLine}` });
  } catch (err) {
    results.push({ name, pass: false, detail: `${detail} -> FAILED: ${err.message}` });
  }
}

function eq(actual, expected) {
  if (actual !== expected) throw new Error(`expected "${expected}", got "${actual}"`);
}

const DAY = 1000 * 60 * 60 * 24;
const normalizeDate = (s) => {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
};

const inventory = [
  {
    _id: 'EQ1',
    name: 'Mahindra Tractor 575',
    category: 'Tractors',
    description: 'Powerful tractor for ploughing and tilling wet soil.',
    dailyRate: 2000,
    location: 'Coimbatore',
  },
  {
    _id: 'EQ2',
    name: 'Combine Harvester',
    category: 'Harvesters',
    description: 'Harvesting machine for paddy and wheat.',
    dailyRate: 5000,
    location: 'Erode',
  },
];

const reasonOf = (o) => ((o && o.reasons) || []).join(' ');

async function main() {
  await check(
    'recommendation',
    'input: "need a tractor to plough 2 acres, budget under ₹3000"',
    () => {
      const r = ruleBasedRecommend('I need a tractor to plough 2 acres, budget under ₹3000', inventory);
      eq(r.recommendations.length, 1);
      eq(r.recommendations[0].equipment._id, 'EQ1');
      eq(r.recommendations[0].matchScore, 100);
      return `decision: ${r.recommendations[0].equipment.name} (score ${r.recommendations[0].matchScore}) | reason: "${r.recommendations[0].reasoning}"`;
    }
  );

  await check(
    'recommendation',
    'input: "space rocket for interplanetary travel" (nothing in inventory)',
    () => {
      const r = ruleBasedRecommend('I want a space rocket for interplanetary travel', inventory);
      eq(r.recommendations.length, 0);
      return `decision: none | reason: "${r.summary}"`;
    }
  );

  await check(
    'maintenance-risk',
    'equipment: 900 usage hrs, last service 200 days ago, overdue maintenance',
    () => {
      const risk = computeRisk({
        usageHours: 900,
        maintenanceIntervalDays: 90,
        lastMaintenanceDate: new Date(Date.now() - 200 * DAY),
        nextMaintenanceDue: new Date(Date.now() - 10 * DAY),
        maintenanceHistory: [{}],
      });
      eq(risk.riskLevel, 'High');
      eq(risk.score, 90);
      return `decision: ${risk.riskLevel} (score ${risk.score}) | reason: "${risk.explanation}" | action: ${risk.suggestedAction}`;
    }
  );

  await check(
    'maintenance-risk',
    'equipment: no logged usage/history (honest "insufficient data")',
    () => {
      const risk = computeRisk({
        usageHours: 0,
        maintenanceIntervalDays: 90,
        lastMaintenanceDate: null,
        nextMaintenanceDue: null,
        maintenanceHistory: [],
      });
      eq(risk.insufficientData, true);
      eq(risk.riskLevel, 'Low');
      return `decision: ${risk.riskLevel} (score ${risk.score}) | reason: "${risk.summary}"`;
    }
  );

  await check(
    'farmer-assistant',
    'question: "what equipment is available?" (Tamil, offline mode)',
    () => {
      const reply = buildFallbackReply('what equipment is available?', { inventoryCount: 2, equipmentInventory: inventory }, 'tamil');
      if (!/[\u0B80-\u0BFF]/.test(reply)) throw new Error('reply not localised to Tamil');
      return `decision: localised reply | excerpt: "${reply.slice(0, 70)}..."`;
    }
  );

  await check(
    'weather-slot',
    'input: rainProbability 90% (high rain risk)',
    () => {
      const c = classifyDay({ rainProbability: 90, precipitation: 10, conditionMain: 'Rain', severe: false });
      eq(c.classification, 'NOT RECOMMENDED');
      return `decision: ${c.classification} | reason: "${reasonOf(c)}"`;
    }
  );

  await check(
    'weather-slot',
    'input: rainProbability 20%, clear skies',
    () => {
      const c = classifyDay({ rainProbability: 20, precipitation: 0, conditionMain: 'Clear', severe: false });
      eq(c.classification, 'BEST');
      return `decision: ${c.classification} | reason: "${reasonOf(c)}"`;
    }
  );

  await check(
    'scheduling',
    'input: 1-day slot with 90% rain forecast for that day',
    () => {
      const slot = { start: new Date('2026-01-05T00:00:00Z'), end: new Date('2026-01-05T00:00:00Z') };
      const res = evaluateWeather(
        { available: true, daily: [{ date: new Date('2026-01-05T00:00:00Z').toISOString(), rainProbability: 90, precipitation: 10, conditionMain: 'Rain', severe: false }] },
        slot
      );
      eq(res.classification, 'NOT RECOMMENDED');
      return `decision: ${res.classification} | reason: "${res.summary}"`;
    }
  );

  await check(
    'scheduling',
    'input: 1-day slot, no conflicts, good weather',
    async () => {
      const fake = { find: () => ({ lean: async () => [] }) };
      __setBookingModelForTest(fake);

      const analysis = await runSlotAnalysis({
        equipment: inventory[0],
        customerLocation: 'Coimbatore',
        customerCoordinates: null,
        requestedStart: normalizeDate('2026-06-02'),
        requestedDuration: 1,
        dailyForecast: {
          available: true,
          daily: [{ date: new Date('2026-06-02T00:00:00Z').toISOString(), rainProbability: 20, precipitation: 0, conditionMain: 'Clear', severe: false }],
        },
      });
      eq(analysis.recommendation, 'ok');
      eq(analysis.requestedSlot.classification, 'BEST');
      return `decision: book slot | reason(s): ${(analysis.requestedSlot.reasons || []).join(' / ')}`;
    }
  );

  await check(
    'scheduling',
    'input: 1-day slot with existing approved booking conflict',
    async () => {
      __setBookingModelForTest({
        find: () => ({
          lean: async () => [
            {
              _id: 'B1',
              equipment: 'EQ1',
              status: 'approved',
              startDate: normalizeDate('2026-06-02'),
              endDate: normalizeDate('2026-06-02'),
            },
          ],
        }),
      });

      const analysis = await runSlotAnalysis({
        equipment: inventory[0],
        customerLocation: 'Coimbatore',
        customerCoordinates: null,
        requestedStart: normalizeDate('2026-06-02'),
        requestedDuration: 1,
      });
      eq(analysis.recommendation, 'alternatives_required');
      eq(analysis.requestedSlot.available, false);
      return `decision: do not book | reason(s): ${(analysis.requestedSlot.reasons || []).join(' / ')}`;
    }
  );

  await check(
    'capability-report',
    'no GEMINI_API_KEY / OPENWEATHER_API_KEY configured',
    () => {
      const oldGem = process.env.GEMINI_API_KEY;
      const oldW = process.env.OPENWEATHER_API_KEY;
      process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
      process.env.OPENWEATHER_API_KEY = 'your_openweather_api_key_here';
      try {
        const caps = getCapabilities();
        eq(caps.recommendation.mode, 'rule-based');
        eq(caps.scheduling.weather, 'unavailable');
        return `decision: ${JSON.stringify(caps)}`;
      } finally {
        if (oldGem === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = oldGem;
        if (oldW === undefined) delete process.env.OPENWEATHER_API_KEY;
        else process.env.OPENWEATHER_API_KEY = oldW;
      }
    }
  );

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  console.log('\n=== Intelligent decision support: deterministic evaluation ===\n');
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name} | ${r.detail}`);
  }
  console.log(`\nSummary: ${passed} passed, ${failed} failed (of ${results.length})`);
  console.log('Note: results are produced by deterministic rule-based code paths;');
  console.log('no AI inference was used and no metrics were extrapolated.\n');

  process.exitCode = failed === 0 ? 0 : 1;
}

main();