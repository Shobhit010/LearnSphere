const express = require('express');
const {
  createReview,
  getCourseReviews,
  updateReview,
  deleteReview,
  replyToReview,
} = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

router.get('/course/:courseId', getCourseReviews);

// Protected student reviews routes
router.post('/course/:courseId', protect, createReview);

router.route('/:id')
  .patch(protect, updateReview)
  .delete(protect, deleteReview);

// Instructor only reply route
router.post('/:id/reply', protect, restrictTo('teacher', 'admin'), replyToReview);

module.exports = router;
