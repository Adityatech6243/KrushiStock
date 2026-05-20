const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');


const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const errors = {};
    if (!username) errors.username = 'Username is required';
    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const formattedUsername = username.trim().toLowerCase();

    const user = await User.findOne({ username: formattedUsername }).select('+password');

    if (!user || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    const isPasswordValid = await user.matchPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const token = generateToken(user._id);

    logger.info(`User logged in: ${user.username}`);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user.id, isActive: { $ne: false }, deletedAt: null });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Get current user error: ${error.message}`);
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { emailOrUsername } = req.body;
    
    if (!emailOrUsername) {
      return res.status(400).json({ success: false, message: 'Please provide an email or username' });
    }

    const formattedInput = emailOrUsername.trim().toLowerCase();

    // Find user by email or username
    const user = await User.findOne({ 
      $or: [{ email: formattedInput }, { username: formattedInput }] 
    });

    if (!user) {
      // We still return 200 to prevent email enumeration attacks, but we don't send an email
      return res.status(200).json({ success: true, message: 'If an account exists, an OTP has been sent.' });
    }

    // Ensure user has an email
    if (!user.email) {
      return res.status(400).json({ success: false, message: 'No email associated with this account. Please contact an admin.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiration (10 mins)
    user.resetPasswordOTP = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000;
    
    // We must validate save without requiring password validation
    await user.save({ validateModifiedOnly: true });

    // Send Email
    const message = `You requested a password reset. Your OTP is: \n\n${otp}\n\nIt is valid for 10 minutes.`;
    const html = `
      <h3>Password Reset Request</h3>
      <p>You requested a password reset. Your OTP is:</p>
      <h2 style="background: #f4f4f4; padding: 10px; border-radius: 5px; display: inline-block;">${otp}</h2>
      <p>This code is valid for 10 minutes.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset OTP - KrushiStock',
        message,
        html
      });

      res.status(200).json({ success: true, message: 'OTP sent to registered email' });
    } catch (error) {
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpires = undefined;
      await user.save({ validateModifiedOnly: true });

      logger.error(`Error sending OTP email: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Error sending email. Try again later.' });
    }
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`);
    next(error);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const { emailOrUsername, otp } = req.body;
    
    if (!emailOrUsername || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email/username and OTP' });
    }

    const formattedInput = emailOrUsername.trim().toLowerCase();
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      $or: [{ email: formattedInput }, { username: formattedInput }],
      resetPasswordOTP: hashedOTP,
      resetPasswordOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // OTP is valid. Return a temporary reset token (can just be a JWT with a short expiry)
    // Or we can just set a flag on the user or use the JWT token as a reset token
    const resetToken = generateToken(user._id);

    res.status(200).json({ success: true, resetToken, message: 'OTP verified successfully' });
  } catch (error) {
    logger.error(`Verify OTP error: ${error.message}`);
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide reset token and new password' });
    }

    // We verify the token
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'secret');
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;

    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful. Please log in with your new password.' });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  login,
  getCurrentUser,
  forgotPassword,
  verifyOTP,
  resetPassword
};
