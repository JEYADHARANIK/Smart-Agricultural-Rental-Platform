const nodemailer = require('nodemailer');

/**
 * Creates Nodemailer SMTP transport instance
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (
    !host ||
    !user ||
    !pass ||
    host.includes('example.com') ||
    user.includes('your_smtp_user') ||
    pass.includes('your_smtp_password')
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Send password reset email containing secure reset link
 */
const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || '"Smart Agricultural Rental Platform" <no-reply@smartagri.com>';

    const subject = 'Password Reset Request — Smart Agricultural Rental Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 12px;">
        <h2 style="color: #1c3a27; margin-bottom: 16px;">Password Reset Request</h2>
        <p style="color: #333333; font-size: 15px;">Hello ${name || 'Farmer'},</p>
        <p style="color: #555555; font-size: 14px; line-height: 1.6;">
          We received a request to reset the password for your account on the Smart Agricultural Rental Platform.
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #1c3a27; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #555555; font-size: 13px; line-height: 1.5;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #1c3a27; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="color: #888888; font-size: 12px; margin-top: 24px;">
          This link will expire in 30 minutes. If you did not request a password reset, please ignore this email.
        </p>
      </div>
    `;

    if (!transporter) {
      console.log(`[DEVELOPMENT EMAIL MOCK] Password reset link for ${to}: ${resetUrl}`);
      return { success: true, mocked: true };
    }

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return { success: true, mocked: false };
  } catch (error) {
    console.error('Error sending password reset email:', error?.message || error);
    return { success: false, error: error?.message };
  }
};

/**
 * Send password reset confirmation email after successful reset
 */
const sendPasswordResetConfirmationEmail = async ({ to, name }) => {
  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || '"Smart Agricultural Rental Platform" <no-reply@smartagri.com>';

    const subject = 'Your Password Has Been Reset — Smart Agricultural Rental Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 12px;">
        <h2 style="color: #1c3a27; margin-bottom: 16px;">Password Reset Confirmation</h2>
        <p style="color: #333333; font-size: 15px;">Hello ${name || 'Farmer'},</p>
        <p style="color: #555555; font-size: 14px; line-height: 1.6;">
          Your password for the Smart Agricultural Rental Platform has been successfully updated.
        </p>
        <p style="color: #555555; font-size: 14px; line-height: 1.6;">
          If you performed this change, no further action is needed. If you did not perform this change, please contact support immediately.
        </p>
        <p style="color: #888888; font-size: 12px; margin-top: 24px;">
          Smart Agricultural Rental Platform Support Team
        </p>
      </div>
    `;

    if (!transporter) {
      console.log(`[DEVELOPMENT EMAIL MOCK] Password reset confirmation sent to ${to}`);
      return { success: true, mocked: true };
    }

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return { success: true, mocked: false };
  } catch (error) {
    console.error('Error sending confirmation email:', error?.message || error);
    return { success: false, error: error?.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
};
