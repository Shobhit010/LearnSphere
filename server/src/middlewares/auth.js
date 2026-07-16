const jwt = require('jsonwebtoken');
const expressAsyncHandler = require('express-async-handler');
const User = require('../models/User');
const AppError = require('../utils/AppError');

// Middleware to protect routes (Authentication)
const protect = expressAsyncHandler(async (req, res, next) => {
  let token;

  // Check Authorization header for Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access.', 401)
    );
  }

  // Verify access token
  const decoded = jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET || 'local_access_secret_key_123456789_abcdefgh'
  );

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  // Check if user is suspended
  if (currentUser.isSuspended) {
    return next(
      new AppError('Your account has been suspended. Please contact admin support.', 403)
    );
  }

  // Grant access
  req.user = currentUser;
  next();
});

// Middleware to restrict routes (Authorization)
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// Middleware to optionally decode user token if present (doesn't throw error if missing)
const optionalProtect = expressAsyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || 'local_access_secret_key_123456789_abcdefgh'
      );
      const currentUser = await User.findById(decoded.id);
      if (currentUser && !currentUser.isSuspended) {
        req.user = currentUser;
      }
    } catch (err) {
      // Fail silently and proceed as guest
    }
  }
  next();
});

module.exports = {
  protect,
  restrictTo,
  optionalProtect,
};
