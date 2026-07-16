const expressAsyncHandler = require('express-async-handler');
const ForumPost = require('../models/ForumPost');
const Lecture = require('../models/Lecture');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');

// Helper: check if student is enrolled, or is teacher/admin
const verifyForumAccess = async (lectureId, userId, userRole) => {
  if (userRole === 'admin') return true;

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) return false;

  const chapter = await Chapter.findById(lecture.chapterId);
  if (!chapter) return false;

  const course = await Course.findById(chapter.courseId);
  if (!course) return false;

  // Teacher who owns the course has access
  if (course.teacherId.toString() === userId.toString()) return true;

  // Otherwise, must be enrolled student
  const enrollment = await Enrollment.findOne({ studentId: userId, courseId: course._id });
  return !!enrollment;
};

// @desc    Create a forum post or reply
// @route   POST /api/v1/forums/lecture/:lectureId
// @access  Private
const createPost = expressAsyncHandler(async (req, res, next) => {
  const { lectureId } = req.params;
  const { content, parentPostId } = req.body;

  if (!content) {
    return next(new AppError('Please provide content for the post', 400));
  }

  // Verify access
  const hasAccess = await verifyForumAccess(lectureId, req.user.id, req.user.role);
  if (!hasAccess) {
    return next(new AppError('You must be enrolled in this course to participate in discussions', 403));
  }

  // If this is a reply, verify parent post exists
  if (parentPostId) {
    const parentPost = await ForumPost.findById(parentPostId);
    if (!parentPost) {
      return next(new AppError('Parent post not found', 444));
    }
  }

  const post = await ForumPost.create({
    lectureId,
    userId: req.user.id,
    parentPostId: parentPostId || null,
    content,
    upvotes: [],
  });

  // Fetch populated post to return
  const populatedPost = await ForumPost.findById(post._id).populate('userId', 'name avatar role');

  // Trigger in-app notification if it's a reply to someone
  if (parentPostId) {
    const parentPost = await ForumPost.findById(parentPostId);
    if (parentPost && parentPost.userId.toString() !== req.user.id.toString()) {
      const lecture = await Lecture.findById(lectureId);
      const Notification = require('../models/Notification');
      await Notification.create({
        userId: parentPost.userId,
        type: 'reply',
        message: `${req.user.name} replied to your forum post on lecture "${lecture.title}".`,
        link: `/courses/${lectureId}`, // Or player path
      });
    }
  }

  res.status(201).json({
    success: true,
    data: populatedPost,
    message: 'Post created successfully',
  });
});

// @desc    Get threaded forum posts for a lecture
// @route   GET /api/v1/forums/lecture/:lectureId
// @access  Private
const getLecturePosts = expressAsyncHandler(async (req, res, next) => {
  const { lectureId } = req.params;

  // Verify access
  const hasAccess = await verifyForumAccess(lectureId, req.user.id, req.user.role);
  if (!hasAccess) {
    return next(new AppError('You must be enrolled in this course to view discussions', 403));
  }

  // Fetch all posts for the lecture
  const allPosts = await ForumPost.find({ lectureId })
    .populate('userId', 'name avatar role')
    .sort({ createdAt: 1 }); // Sorted by oldest first to follow conversations naturally

  // Thread posts: separate top-level posts from replies
  const threads = [];
  const repliesMap = {};

  allPosts.forEach((post) => {
    const postObj = post.toObject();
    postObj.replies = [];
    postObj.upvotesCount = post.upvotes.length;
    postObj.isUpvoted = post.upvotes.includes(req.user.id);

    if (!post.parentPostId) {
      threads.push(postObj);
    } else {
      const parentId = post.parentPostId.toString();
      if (!repliesMap[parentId]) {
        repliesMap[parentId] = [];
      }
      repliesMap[parentId].push(postObj);
    }
  });

  // Attach replies to their parent threads
  const threadedPosts = threads.map((thread) => {
    thread.replies = repliesMap[thread._id.toString()] || [];
    return thread;
  });

  // Sort top-level threads: most upvoted and newest first
  threadedPosts.sort((a, b) => b.upvotesCount - a.upvotesCount || new Date(b.createdAt) - new Date(a.createdAt));

  res.status(200).json({
    success: true,
    data: threadedPosts,
  });
});

// @desc    Toggle upvote on a post
// @route   PATCH /api/v1/forums/:id/upvote
// @access  Private
const toggleUpvotePost = expressAsyncHandler(async (req, res, next) => {
  const post = await ForumPost.findById(req.params.id);

  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  // Verify access to the post's lecture forum
  const hasAccess = await verifyForumAccess(post.lectureId, req.user.id, req.user.role);
  if (!hasAccess) {
    return next(new AppError('You must be enrolled in this course to participate', 403));
  }

  const isUpvoted = post.upvotes.includes(req.user.id);

  if (isUpvoted) {
    // Remove upvote
    post.upvotes = post.upvotes.filter((id) => id.toString() !== req.user.id.toString());
  } else {
    // Add upvote
    post.upvotes.push(req.user.id);
  }

  await post.save();

  res.status(200).json({
    success: true,
    data: {
      isUpvoted: !isUpvoted,
      upvotesCount: post.upvotes.length,
    },
    message: isUpvoted ? 'Upvote removed' : 'Post upvoted successfully',
  });
});

// @desc    Delete a forum post
// @route   DELETE /api/v1/forums/:id
// @access  Private
const deletePost = expressAsyncHandler(async (req, res, next) => {
  const post = await ForumPost.findById(req.params.id);

  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  // Check deletion authority: author of post, teacher of the course, or admin
  let canDelete = false;

  if (req.user.role === 'admin') {
    canDelete = true;
  } else if (post.userId.toString() === req.user.id.toString()) {
    canDelete = true;
  } else {
    // Check if user is the course instructor
    const lecture = await Lecture.findById(post.lectureId);
    if (lecture) {
      const chapter = await Chapter.findById(lecture.chapterId);
      if (chapter) {
        const course = await Course.findById(chapter.courseId);
        if (course && course.teacherId.toString() === req.user.id.toString()) {
          canDelete = true;
        }
      }
    }
  }

  if (!canDelete) {
    return next(new AppError('You do not have permission to delete this post', 403));
  }

  // If this is a top-level post, delete its replies as well
  if (!post.parentPostId) {
    await ForumPost.deleteMany({ parentPostId: post._id });
  }

  await ForumPost.findByIdAndDelete(post._id);

  res.status(200).json({
    success: true,
    data: {},
    message: 'Post deleted successfully',
  });
});

module.exports = {
  createPost,
  getLecturePosts,
  toggleUpvotePost,
  deletePost,
};
