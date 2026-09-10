/**
 * SMS Notification Service
 *
 * Provides a clean provider abstraction for sending SMS to farmers.
 * - If TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are configured
 *   and the `twilio` package is installed, real SMS are attempted.
 * - Otherwise a development/mock provider logs the message to stdout and stores
 *   a delivery log. Delivery is NEVER claimed as production-tested without real
 *   credentials.
 */

const sendMockSms = async ({ to, body }) => {
  console.log(`[SMS MOCK] to=${to} body=${body.slice(0, 160)}`);
  return { success: true, mocked: true, provider: 'mock' };
};

const isTwilioConfigured = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  return !!(sid && token && from && sid !== 'your_twilio_account_sid' && token !== 'your_twilio_auth_token');
};

const sendSms = async ({ to, body }) => {
  if (!to) {
    return { success: false, error: 'No recipient phone number provided' };
  }

  try {
    if (!isTwilioConfigured()) {
      return await sendMockSms({ to, body });
    }

    let twilio;
    try {
      twilio = require('twilio');
    } catch (err) {
      console.warn('[SMS] twilio package not installed; falling back to mock provider.');
      return await sendMockSms({ to, body });
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      to,
      from: process.env.TWILIO_FROM_NUMBER,
      body,
    });

    return { success: true, mocked: false, provider: 'twilio' };
  } catch (error) {
    console.error('[SMS] delivery error:', error?.message || error);
    return { success: false, error: error?.message || 'SMS delivery failed' };
  }
};

module.exports = { sendSms, isTwilioConfigured };