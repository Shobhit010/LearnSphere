const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login or registration attempts from this IP, please try again after 15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
};
