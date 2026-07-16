const express = require('express');
const {
  createChapter,
  getChaptersByCourse,
  updateChapter,
  deleteChapter,
  reorderChapters,
} = require('../controllers/chapterController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

// Public course view
router.get('/course/:courseId', getChaptersByCourse);

// Teacher and Admin curriculum management routes
router.use(protect, restrictTo('teacher', 'admin'));

router.post('/', createChapter);
router.patch('/reorder', reorderChapters);

router.route('/:id')
  .patch(updateChapter)
  .delete(deleteChapter);

module.exports = router;
