const { test } = require('node:test');
const assert = require('node:assert');
const { classifyDay } = require('../utils/weatherService');

test('classifyDay: severe weather is NOT RECOMMENDED', () => {
  const result = classifyDay({ severe: true, rainProbability: 20, precipitation: 0 });
  assert.strictEqual(result.classification, 'NOT RECOMMENDED');
});

test('classifyDay: rain probability >= 75 is NOT RECOMMENDED', () => {
  const result = classifyDay({ rainProbability: 90, precipitation: 0 });
  assert.strictEqual(result.classification, 'NOT RECOMMENDED');
});

test('classifyDay: high precipitation is NOT RECOMMENDED even without pop', () => {
  const result = classifyDay({ rainProbability: null, precipitation: 12 });
  assert.strictEqual(result.classification, 'NOT RECOMMENDED');
});

test('classifyDay: moderate rain (40-74) is USABLE', () => {
  const result = classifyDay({ rainProbability: 60, precipitation: 0 });
  assert.strictEqual(result.classification, 'USABLE');
});

test('classifyDay: low rain is BEST', () => {
  const result = classifyDay({ rainProbability: 30, precipitation: 0, conditionMain: 'Clear' });
  assert.strictEqual(result.classification, 'BEST');
});

test('classifyDay: missing data degrades to BEST with a note, never crashes', () => {
  const result = classifyDay({}); // eslint-disable-line no-empty-object
  assert.strictEqual(result.classification, 'BEST');
  assert.ok(Array.isArray(result.reasons));
});

test('classifyDay: null entry falls back to USABLE', () => {
  const result = classifyDay(null);
  assert.strictEqual(result.classification, 'USABLE');
});