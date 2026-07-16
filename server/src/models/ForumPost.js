const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema(
  {
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumPost',
      default: null, // Null indicates a top-level post, otherwise it's a reply
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Please provide content for your post'],
      trim: true,
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index to retrieve all posts for a lecture, sorted by newest or most upvoted
forumPostSchema.index({ lectureId: 1, parentPostId: 1, createdAt: -1 });

const ForumPost = mongoose.model('ForumPost', forumPostSchema);

module.exports = ForumPost;
