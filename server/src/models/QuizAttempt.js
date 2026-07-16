const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
    },
    answers: {
      type: [Number], // Storing indices of chosen options
      required: true,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Index to quickly fetch a student's attempts for a specific quiz
quizAttemptSchema.index({ studentId: 1, quizId: 1, attemptedAt: -1 });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

module.exports = QuizAttempt;
