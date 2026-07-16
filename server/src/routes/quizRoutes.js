const express = require('express');
const {
  getChapterQuiz,
  submitQuizAttempt,
} = require('../controllers/quizController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/chapter/:chapterId', getChapterQuiz);
router.post('/:id/attempt', submitQuizAttempt);

module.exports = router;
