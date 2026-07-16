const express = require('express');
const {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Apply authLimiter to sign up, sign in, and forgot-password endpoints
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Session endpoints
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected endpoints
router.get('/me', protect, getMe);

module.exports = router;
