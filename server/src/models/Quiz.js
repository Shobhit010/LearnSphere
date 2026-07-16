const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function (val) {
        return val.length >= 2 && val.length <= 4;
      },
      message: 'Options list must contain between 2 and 4 choices.',
    },
  },
  correctOptionIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  explanation: {
    type: String,
    default: '',
  },
});

const quizSchema = new mongoose.Schema(
  {
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
      unique: true, // One quiz per chapter
      index: true,
    },
    questions: [questionSchema],
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
