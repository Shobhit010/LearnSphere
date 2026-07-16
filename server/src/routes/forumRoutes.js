const express = require('express');
const {
  createPost,
  getLecturePosts,
  toggleUpvotePost,
  deletePost,
} = require('../controllers/forumController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/lecture/:lectureId')
  .get(getLecturePosts)
  .post(createPost);

router.patch('/:id/upvote', toggleUpvotePost);
router.delete('/:id', deletePost);

module.exports = router;
