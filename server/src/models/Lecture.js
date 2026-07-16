const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['pdf', 'ppt', 'zip', 'link'],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  size: {
    type: Number, // in bytes
    default: 0,
  },
});

const lectureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a lecture title'],
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
      index: true,
    },
    youtubeVideoId: {
      type: String,
      required: [true, 'Please provide a YouTube Video ID or URL'],
      trim: true,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    isPreviewFree: {
      type: Boolean,
      default: false,
    },
    transcript: {
      type: String,
      default: '', // Store transcript text for search & AI helper
    },
    resources: [resourceSchema],
  },
  {
    timestamps: true,
  }
);

// Index for query optimization by sorting order per chapter
lectureSchema.index({ chapterId: 1, order: 1 });

const Lecture = mongoose.model('Lecture', lectureSchema);

module.exports = Lecture;
