const { test } = require('node:test');
const assert = require('node:assert');
const {
  tokenize,
  extractBudget,
  ruleBasedRecommend,
} = require('../services/recommendationEngine');

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
  {
    _id: 'EQ3',
    name: 'Water Pump Set',
    category: 'Irrigation',
    description: 'Diesel water pump for irrigation.',
    dailyRate: 1500,
    location: 'Salem',
    status: 'Available',
  },
];

test('recommendation: tokenize strips stopwords', () => {
  const tokens = tokenize('I need a tractor for ploughing 2 acres');
  assert.ok(tokens.includes('tractor'));
  assert.ok(tokens.includes('ploughing'));
  assert.ok(!tokens.includes('need'));
  assert.ok(!tokens.includes('for'));
});

test('recommendation: extractBudget parses rupee amounts', () => {
  assert.strictEqual(extractBudget('I have under ₹5000 per day'), 5000);
  assert.strictEqual(extractBudget('under Rs 3000'), 3000);
  assert.strictEqual(extractBudget('around 2 thousand'), 2000);
  assert.strictEqual(extractBudget('no budget mentioned'), null);
});

test('recommendation: returns the real tractor for a tractor+budget request', () => {
  const result = ruleBasedRecommend('I need a tractor to plough 2 acres, budget under ₹3000', inventory);
  assert.strictEqual(result.mode, undefined); // mode is added by the service layer
  assert.strictEqual(result.recommendations.length, 1);
  assert.strictEqual(result.recommendations[0].equipment._id, 'EQ1');
  assert.strictEqual(result.recommendations[0].matchScore, 100);
  assert.ok(result.recommendations[0].reasoning.length > 0);
  assert.strictEqual(result.detectedBudget, 3000);
});

test('recommendation: never exceeds a stated budget', () => {
  const result = ruleBasedRecommend('need a harvester under ₹2000', inventory);
  for (const rec of result.recommendations) {
    assert.ok(rec.equipment.dailyRate <= 2000);
  }
});

test('recommendation: no suitable match returns empty recommendations', () => {
  const result = ruleBasedRecommend('I want a space rocket for interplanetary travel', inventory);
  assert.strictEqual(result.recommendations.length, 0);
  assert.ok(/no suitable|requirement/i.test(result.summary));
});

test('recommendation: budget bonus never promotes irrelevant units', () => {
  const result = ruleBasedRecommend('I need a tractor to plough 2 acres, budget under ₹3000', inventory);
  const ids = result.recommendations.map((r) => r.equipment._id);
  assert.ok(!ids.includes('EQ3')); // water pump matches nothing about tractors
});

test('recommendation: results are capped at three and sorted by score', () => {
  const many = [
    { ...inventory[0], dailyRate: 1500 },
    { ...inventory[0], _id: 'EQ4', name: 'Landforce Tractor' },
    { ...inventory[0], _id: 'EQ5', name: 'Sonalika Tractor' },
    { ...inventory[0], _id: 'EQ6', name: 'Eicher Tractor' },
  ];
  const result = ruleBasedRecommend('need a tractor for ploughing', many);
  assert.ok(result.recommendations.length <= 3);
  for (let i = 1; i < result.recommendations.length; i++) {
    assert.ok(result.recommendations[i - 1].matchScore >= result.recommendations[i].matchScore);
  }
});