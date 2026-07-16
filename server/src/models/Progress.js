const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    completedLectures: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture',
      },
    ],
    percentComplete: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastAccessedLecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for easy retrieval of specific student's course progress
progressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress;
