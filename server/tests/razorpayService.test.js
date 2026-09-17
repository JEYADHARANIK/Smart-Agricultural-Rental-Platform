const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

process.env.RAZORPAY_KEY_ID = 'test_key_id';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_for_hmac';

const razorpayService = require('../utils/razorpayService');

test('razorpay: verifySignature accepts a valid HMAC signature', () => {
  const orderId = 'order_P_X123';
  const paymentId = 'pay_P_Y456';
  const signature = crypto
    .createHmac('sha256', 'test_secret_for_hmac')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  assert.strictEqual(razorpayService.verifySignature({ orderId, paymentId, signature }), true);
});

test('razorpay: verifySignature rejects a tampered signature', () => {
  const orderId = 'order_P_X123';
  const paymentId = 'pay_P_Y456';
  const correct = crypto
    .createHmac('sha256', 'test_secret_for_hmac')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const tampered = (correct.slice(0, correct.length - 1) + (correct.endsWith('0') ? '1' : '0'));
  assert.strictEqual(razorpayService.verifySignature({ orderId, paymentId, signature: tampered }), false);
});

test('razorpay: verifySignature returns false (never throws) when fields are missing', () => {
  assert.strictEqual(razorpayService.verifySignature({ orderId: '', paymentId: 'pay_P_Y456', signature: 'a'.repeat(64) }), false);
  assert.strictEqual(razorpayService.verifySignature({ orderId: 'order_P_X123', paymentId: null, signature: 'a'.repeat(64) }), false);
  assert.strictEqual(razorpayService.verifySignature({ orderId: 'order_P_X123', paymentId: 'pay_P_Y456', signature: '' }), false);
  assert.strictEqual(razorpayService.verifySignature({ orderId: 'order_P_X123', paymentId: 'pay_P_Y456', signature: undefined }), false);
  assert.strictEqual(razorpayService.verifySignature({}), false);
});

test('razorpay: verifySignature returns false for malformed signatures without throwing', () => {
  assert.strictEqual(razorpayService.verifySignature({ orderId: 'order_P_X123', paymentId: 'pay_P_Y456', signature: 'too-short' }), false);
  assert.strictEqual(razorpayService.verifySignature({ orderId: 'order_P_X123', paymentId: 'pay_P_Y456', signature: 'zz'.repeat(32) }), false);
  assert.strictEqual(razorpayService.verifySignature({ orderId: 'order_P_X123', paymentId: 'pay_P_Y456', signature: 'A'.repeat(63) + 'z' }), false);
});