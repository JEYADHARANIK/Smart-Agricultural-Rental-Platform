const { test } = require('node:test');
const assert = require('node:assert');
const {
  getCapabilities,
  runRecommendation,
} = require('../services/intelligenceService');

async function withEnv(key, value, fn) {
  const original = process.env[key];
  process.env[key] = value;
  try {
    return await fn();
  } finally {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
}

const inventory = [
  {
    _id: 'EQ1',
    name: 'Mahindra Tractor 575',
    category: 'Tractors',
    description: 'Powerful tractor for ploughing and tilling wet soil.',
    dailyRate: 2000,
    location: 'Coimbatore',
    status: 'Available',
  },
  {
    _id: 'EQ2',
    name: 'Combine Harvester',
    category: 'Harvesters',
    description: 'Harvesting machine for paddy and wheat.',
    dailyRate: 5000,
    location: 'Erode',
    status: 'Available',
  },
];

test('intelligence: capabilities are honest when nothing is configured', async () => {
  await withEnv('GEMINI_API_KEY', 'your_gemini_api_key_here', async () => {
    await withEnv('OPENWEATHER_API_KEY', 'your_openweather_api_key_here', async () => {
      const caps = getCapabilities();
      assert.strictEqual(caps.recommendation.mode, 'rule-based');
      assert.strictEqual(caps.assistant.mode, 'rule-based');
      assert.strictEqual(caps.scheduling.weather, 'unavailable');
      assert.strictEqual(caps.maintenance.mode, 'deterministic');
      assert.ok(Array.isArray(caps.scheduling.classifications));
      assert.ok(Array.isArray(caps.assistant.languages));
      assert.ok(caps.generatedAt);
    });
  });
});

test('intelligence: runRecommendation uses the rule engine without a key', async () => {
  await withEnv('GEMINI_API_KEY', 'your_gemini_api_key_here', async () => {
    const result = await runRecommendation({
      prompt: 'I need a tractor to plough my field',
      availableEquipment: inventory,
    });
    assert.strictEqual(result.mode, 'rule-based');
    assert.ok(result.recommendations.length >= 1);
    for (const rec of result.recommendations) {
      assert.ok(rec.equipment && rec.equipment._id);
      assert.ok(rec.matchScore >= 0 && rec.matchScore <= 100);
      assert.ok(typeof rec.reasoning === 'string' && rec.reasoning.length > 0);
    }
  });
});

test('intelligence: runRecommendation returns empty for empty inventory', async () => {
  await withEnv('GEMINI_API_KEY', 'your_gemini_api_key_here', async () => {
    const result = await runRecommendation({ prompt: 'need a tractor', availableEquipment: [] });
    assert.strictEqual(result.mode, 'rule-based');
    assert.strictEqual(result.recommendations.length, 0);
  });
});