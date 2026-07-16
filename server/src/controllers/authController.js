const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const expressAsyncHandler = require('express-async-handler');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendTokenResponse } = require('../utils/token');

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
const register = expressAsyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email is already registered', 400));
  }

  // Determine teacher approval state
  const isApprovedTeacher = role === 'teacher' ? (process.env.NODE_ENV === 'development') : false; // teachers require admin approval (auto-approved in dev)

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'student',
    isApprovedTeacher,
  });

  await sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = expressAsyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate fields
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check if suspended
  if (user.isSuspended) {
    return next(new AppError('Account is suspended', 403));
  }

  await sendTokenResponse(user, 200, res);
});

// @desc    Refresh session token
// @route   POST /api/v1/auth/refresh
// @access  Public
const refresh = expressAsyncHandler(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return next(new AppError('Refresh token not provided', 401));
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'local_refresh_secret_key_987654321_hgfedcba'
    );

    // Find user by id and check refresh token
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return next(new AppError('Invalid refresh token session', 401));
    }

    if (user.isSuspended) {
      return next(new AppError('Account is suspended', 403));
    }

    // Send new tokens
    await sendTokenResponse(user, 200, res);
  } catch (err) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = expressAsyncHandler(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    // Clear refreshToken in database
    await User.findOneAndUpdate(
      { refreshToken },
      { $unset: { refreshToken: 1 } }
    );
  }

  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 500),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
    message: 'User logged out successfully',
  });
});

// @desc    Forgot Password (generates a reset token)
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = expressAsyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // Generate short-lived (10m) password reset token
  const resetToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'local_refresh_secret_key_987654321_hgfedcba',
    { expiresIn: '10m' }
  );

  // In a real application, email this link.
  // For development and testing, print to console and return in response
  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;

  console.log(`[DEVELOPMENT] Password Reset URL: ${resetUrl}`);

  res.status(200).json({
    success: true,
    message: 'Token sent to email! (For testing, see server console or the resetToken field)',
    data: {
      resetToken,
      resetUrl,
    },
  });
});

// @desc    Reset Password
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
const resetPassword = expressAsyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return next(new AppError('Please provide a new password', 400));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'local_refresh_secret_key_987654321_hgfedcba'
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('Invalid token or user does not exist', 400));
    }

    // Set new password
    user.password = password;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (err) {
    return next(new AppError('Password reset token is invalid or has expired', 400));
  }
});

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: user,
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
