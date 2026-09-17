const { test } = require('node:test');
const assert = require('node:assert');
const {
  buildFallbackReply,
} = require('../services/farmerAssistant');

const ctx = {
  inventoryCount: 2,
  equipmentInventory: [
    { name: 'Mahindra Tractor', dailyRate: 2000 },
    { name: 'Water Pump', dailyRate: 1500 },
  ],
};

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

test('assistant: English weather slot explanation mentions BEST/USABLE', () => {
  const reply = buildFallbackReply('What does BEST mean?', ctx, 'english');
  assert.ok(reply.includes('BEST'));
  assert.ok(reply.includes('USABLE'));
});

test('assistant: English price reply lists real rates from context', () => {
  const reply = buildFallbackReply('what are the prices?', ctx, 'english');
  assert.ok(reply.includes('2000'));
  assert.ok(reply.includes('1500'));
});

test('assistant: Tamil availability reply is localised and uses real count', () => {
  const reply = buildFallbackReply('what equipment is available?', ctx, 'tamil');
  assert.ok(reply.includes('2'));
  assert.ok(/[\u0B80-\u0BFF]/.test(reply)); // contains Tamil script
});

test('assistant: Hindi booking steps are localised', () => {
  const reply = buildFallbackReply('how do I book a tractor?', ctx, 'hindi');
  assert.ok(/[\u0900-\u097F]/.test(reply)); // contains Devanagari script
});

test('assistant: Kannada default greeting is localised', () => {
  const reply = buildFallbackReply('namaste', ctx, 'kannada');
  assert.ok(/[\u0C80-\u0CFF]/.test(reply)); // contains Kannada script
});

test('assistant: unknown language falls back to English help line', () => {
  const reply = buildFallbackReply('hello there', ctx, 'xunknown');
  assert.ok(reply.includes('localized help'));
  assert.ok(!/[\u0B80-\u0BFF]/.test(reply)); // not localised for a bogus language
});

test('assistant: empty inventory reply is honest, not invented', () => {
  const empty = { inventoryCount: 0, equipmentInventory: [] };
  const reply = buildFallbackReply('what is available?', empty, 'english');
  assert.ok(/no available equipment/i.test(reply));
});

test('assistant: runAssistantReply is rule-based when Gemini is not configured', async () => {
  const { runAssistantReply } = require('../services/farmerAssistant');
  await withEnv('GEMINI_API_KEY', 'your_gemini_api_key_here', async () => {
    const result = await runAssistantReply({ message: 'what equipment is available?', language: 'english', context: ctx });
    assert.strictEqual(result.mode, 'rule-based');
    assert.ok(result.reply.length > 0);
  });
});