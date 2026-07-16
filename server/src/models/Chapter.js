const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a chapter title'],
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on courseId and order to keep it unique or quickly sortable
chapterSchema.index({ courseId: 1, order: 1 });

const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;
