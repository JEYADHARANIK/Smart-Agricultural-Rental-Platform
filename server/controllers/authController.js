const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const emailService = require('../utils/emailService');

// Helper to generate JWT Token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new customer account
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, location, address } = req.body;

    if (!name || !email || !password || !phone || !location || !address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, password, phone, location, address)',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Always enforce role to 'customer' for public registration
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      location,
      address,
      role: 'customer',
      googleId: req.body.googleId || null,
      authProvider: req.body.authProvider || (req.body.googleId ? 'google' : 'local'),
    });

    if (user) {
      const token = generateToken(user._id);
      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          location: user.location,
          address: user.address,
          role: user.role,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user data received',
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    // Find user by email and select password field explicitly
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login',
    });
  }
};

// @desc    Authenticate user with Google OAuth credential
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Google credential token',
      });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId || googleClientId === 'your_google_client_id_here') {
      return res.status(500).json({
        success: false,
        message: 'Google Client ID is not configured on the server',
      });
    }

    const client = new OAuth2Client(googleClientId);

    // Verify Google ID Token server-side
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google token verification error:', verifyError.message);
      return res.status(401).json({
        success: false,
        message: 'Google sign-in could not be completed. Invalid or expired Google token.',
      });
    }

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Google account is unverified or email is missing',
      });
    }

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;

    let user = await User.findOne({ email });

    if (user) {
      // CASE 1 — ACCOUNT EXISTS:
      // Authenticate existing user (local or google), link googleId if missing, preserve password & role.
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }

      const token = generateToken(user._id);

      return res.status(200).json({
        success: true,
        message: 'Google login successful',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          location: user.location,
          address: user.address,
          role: user.role,
        },
      });
    }

    // CASE 2 — ACCOUNT DOES NOT EXIST:
    // DO NOT automatically create a User document. Return isNewUser flag with verified Google details.
    return res.status(200).json({
      success: false,
      isNewUser: true,
      message: 'Account not found. Please create an account to continue.',
      googleUser: {
        name: payload.name || email.split('@')[0],
        email,
        googleId,
      },
    });
  } catch (error) {
    console.error('Google login server error:', error);
    return res.status(500).json({
      success: false,
      message: 'Google sign-in could not be completed. Please try again.',
    });
  }
};

// @desc    Initiate password reset (send reset link via email)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const genericResponse = {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    };

    // Find user by email (selecting password field to inspect if local password exists)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // Security requirement: Always return the same generic message whether account exists or not
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Google-only account check: Do not send reset email for Google-only accounts without password
    if (user.authProvider === 'google' && !user.password) {
      return res.status(200).json(genericResponse);
    }

    // Generate cryptographically secure random token (32 bytes = 64 hex characters)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash the token using SHA-256 before storing in DB
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Set token & 30-minute expiration
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    // Construct reset URL using FRONTEND_URL environment variable
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

    // Send reset email via reusable service
    await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing password reset request',
    });
  }
};

// @desc    Reset password using reset token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both password and confirmPassword fields',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Hash the incoming raw token from URL to match stored hashed token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user whose stored hashed token matches AND is not expired
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token',
      });
    }

    // Update password (pre('save') hook will hash it with bcryptjs)
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // If account was previously Google-only without a password, switch to local auth Provider
    if (user.authProvider === 'google') {
      user.authProvider = 'local';
    }

    await user.save();

    // Send password reset confirmation email
    await emailService.sendPasswordResetConfirmationEmail({
      to: user.email,
      name: user.name,
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error resetting password',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving profile',
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleLogin,
  forgotPassword,
  resetPassword,
  getMe,
};
