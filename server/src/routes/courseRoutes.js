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

// Teacher workflow: submit course for admin review
router.patch('/:id/submit', protect, restrictTo('teacher', 'admin'), submitCourseForReview);

// Admin workflow: approve or reject course
router.patch('/:id/review', protect, restrictTo('admin'), approveOrRejectCourse);

module.exports = router;
