/**
 * Razorpay Payment Integration
 *
 * Creates Razorpay orders and verifies payment signatures directly against
 * the Razorpay API using HTTP Basic Auth (no extra SDK dependency).
 *
 * RZ PAYOUT: RAZORPAY_KEY_ID exposes only the public key to the frontend;
 * RAZORPAY_KEY_SECRET stays server-side and is only used for HMAC signature
 * verification and backend API calls.
 */

const crypto = require('crypto');

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

const isConfigured = () =>
  !!KEY_ID &&
  !!KEY_SECRET &&
  KEY_ID !== 'your_razorpay_key_id' &&
  KEY_SECRET !== 'your_razorpay_key_secret';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

async function createOrder({ amount, currency = 'INR', receipt }) {
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64'),
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.description || `Razorpay create order failed (${res.status})`);
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

/**
 * Verify Razorpay payment signature cryptographically server-side.
 * Returns false (never throws) when inputs are missing/malformed or the signature mismatches.
 */
function verifySignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || typeof signature !== 'string' || !signature || !KEY_SECRET) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  if (signature.length !== expected.length) {
    return false;
  }
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

module.exports = {
  createOrder,
  verifySignature,
  isConfigured,
  getKeyId: () => KEY_ID,
};