const express = require('express');
const {
  getCourseProgress,
  updateLectureProgress,
} = require('../controllers/progressController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/course/:courseId', getCourseProgress);
router.patch('/course/:courseId/lecture/:lectureId', updateLectureProgress);

module.exports = router;
