const express = require('express');
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  uploadCourseThumbnail,
  submitCourseForReview,
  approveOrRejectCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { protect, restrictTo, optionalProtect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = express.Router();

// Public / optional auth endpoints
router.route('/')
  .get(optionalProtect, getCourses)
  .post(protect, restrictTo('teacher', 'admin'), createCourse);

router.route('/:id')
  .get(optionalProtect, getCourseById)
  .patch(protect, restrictTo('teacher', 'admin'), updateCourse)
  .delete(protect, restrictTo('teacher', 'admin'), deleteCourse);

// Thumbnail upload
router.patch('/:id/thumbnail', protect, restrictTo('teacher', 'admin'), upload.single('thumbnail'), uploadCourseThumbnail);

// Teacher workflow: publish course directly
router.patch('/:id/submit', protect, restrictTo('teacher', 'admin'), submitCourseForReview);

// Legacy review endpoint kept for compatibility
router.patch('/:id/review', protect, restrictTo('teacher', 'admin'), approveOrRejectCourse);

module.exports = router;
