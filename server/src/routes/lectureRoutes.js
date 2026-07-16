const express = require('express');
const {
  createLecture,
  getLecturesByChapter,
  updateLecture,
  deleteLecture,
  reorderLectures,
  addResource,
  deleteResource,
} = require('../controllers/lectureController');
const { protect, restrictTo } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = express.Router();

// Fetching lectures of a chapter requires authentication
router.get('/chapter/:chapterId', protect, getLecturesByChapter);

// Teacher and Admin curriculum management routes
router.use(protect, restrictTo('teacher', 'admin'));

router.post('/', createLecture);
router.patch('/reorder', reorderLectures);

router.route('/:id')
  .patch(updateLecture)
  .delete(deleteLecture);

// Resources endpoints
router.post('/:id/resources', upload.single('file'), addResource);
router.delete('/:id/resources/:resourceId', deleteResource);

module.exports = router;
