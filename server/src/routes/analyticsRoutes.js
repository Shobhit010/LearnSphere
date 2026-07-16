const express = require('express');
const {
  getTeacherAnalytics,
  getStudentAnalytics,
  getAdminAnalytics,
} = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/student', getStudentAnalytics);
router.get('/teacher', restrictTo('teacher', 'admin'), getTeacherAnalytics);
router.get('/admin', restrictTo('admin'), getAdminAnalytics);

module.exports = router;
