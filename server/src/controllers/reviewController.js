const expressAsyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const AppError = require('../utils/AppError');

// @desc    Create a course review
// @route   POST /api/v1/reviews/course/:courseId
// @access  Private
const createReview = expressAsyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { rating, comment } = req.body;

  if (!rating) {
    return next(new AppError('Please provide a rating between 1 and 5', 400));
  }

  // 1. Check enrollment
  const enrollment = await Enrollment.findOne({
    studentId: req.user.id,
    courseId,
  });

  if (!enrollment) {
    return next(new AppError('You must purchase the course before leaving a review', 403));
  }

  // 2. Check progress eligibility (>= 10% progress)
  const progress = await Progress.findOne({
    studentId: req.user.id,
    courseId,
  });

  const progressPercent = progress ? progress.percentComplete : 0;
  if (progressPercent < 10) {
    return next(
      new AppError(
        `You must complete at least 10% of the course to leave a review. Your current progress: ${progressPercent}%`,
        403
      )
    );
  }

  // 3. Check if user already reviewed
  const existingReview = await Review.findOne({
    courseId,
    studentId: req.user.id,
  });

  if (existingReview) {
    return next(new AppError('You have already reviewed this course. You can edit your existing review.', 400));
  }

  // 4. Create review
  const review = await Review.create({
    courseId,
    studentId: req.user.id,
    rating,
    comment: comment || '',
  });

  res.status(201).json({
    success: true,
    data: review,
    message: 'Review submitted successfully',
  });
});

// @desc    Get all reviews for a course (Public)
// @route   GET /api/v1/reviews/course/:courseId
// @access  Public
const getCourseReviews = expressAsyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  const reviews = await Review.find({ courseId })
    .populate('studentId', 'name avatar')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: reviews,
  });
});

// @desc    Update a review
// @route   PATCH /api/v1/reviews/:id
// @access  Private
const updateReview = expressAsyncHandler(async (req, res, next) => {
  const { rating, comment } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  // Check ownership
  if (review.studentId.toString() !== req.user.id.toString()) {
    return next(new AppError('You do not have permission to edit this review', 403));
  }

  review.rating = rating || review.rating;
  if (comment !== undefined) review.comment = comment;

  await review.save(); // pre-save hook will recalculate averages

  res.status(200).json({
    success: true,
    data: review,
    message: 'Review updated successfully',
  });
});

// @desc    Delete a review (Student / Admin)
// @route   DELETE /api/v1/reviews/:id
// @access  Private
const deleteReview = expressAsyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  // Check ownership or admin status
  if (review.studentId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to delete this review', 403));
  }

  await Review.deleteOne({ _id: review._id }); // triggers post-deleteOne hook to recalculate avg

  res.status(200).json({
    success: true,
    data: {},
    message: 'Review deleted successfully',
  });
});

// @desc    Teacher reply to a review
// @route   POST /api/v1/reviews/:id/reply
// @access  Private/Teacher
const replyToReview = expressAsyncHandler(async (req, res, next) => {
  const { replyText } = req.body;

  if (!replyText) {
    return next(new AppError('Please provide reply text', 400));
  }

  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  // Check course ownership
  const course = await Course.findById(review.courseId);
  if (!course || (course.teacherId.toString() !== req.user.id.toString() && req.user.role !== 'admin')) {
    return next(new AppError('Only the course instructor can reply to this review', 403));
  }

  review.teacherReply = replyText;
  await review.save();

  // Notify student of response
  const Notification = require('../models/Notification');
  await Notification.create({
    userId: review.studentId,
    type: 'reply',
    message: `Instructor Sarah Jenkins replied to your review on "${course.title}".`,
    link: `/courses/${course._id}`,
  });

  res.status(200).json({
    success: true,
    data: review,
    message: 'Review reply posted successfully',
  });
});

module.exports = {
  createReview,
  getCourseReviews,
  updateReview,
  deleteReview,
  replyToReview,
};
