const express = require('express');
const rateLimit = require('express-rate-limit');
const { askLectureAssistantEndpoint } = require('../controllers/aiController');
const { protect } = require('../middlewares/auth');

// Create rate limiter for AI queries
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP or User session
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'You have reached the limit of 30 questions per hour. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.use(protect);

router.post('/lecture/:lectureId/ask', aiLimiter, askLectureAssistantEndpoint);

module.exports = router;
