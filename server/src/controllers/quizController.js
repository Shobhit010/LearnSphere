const expressAsyncHandler = require('express-async-handler');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Chapter = require('../models/Chapter');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const { generateChapterQuiz } = require('../services/aiService');

// Helper to check enrollment
const verifyCourseEnrollment = async (chapterId, userId, userRole) => {
  if (userRole === 'admin') return true;

  const chapter = await Chapter.findById(chapterId);
  if (!chapter) return false;

  const enrollment = await Enrollment.findOne({ studentId: userId, courseId: chapter.courseId });
  return !!enrollment;
};

// @desc    Get practice quiz for a chapter (Generates it if it doesn't exist)
// @route   GET /api/v1/quizzes/chapter/:chapterId
// @access  Private
const getChapterQuiz = expressAsyncHandler(async (req, res, next) => {
  const { chapterId } = req.params;

  // 1. Verify access
  const hasAccess = await verifyCourseEnrollment(chapterId, req.user.id, req.user.role);
  if (!hasAccess) {
    return next(new AppError('You must be enrolled in this course to access quizzes', 403));
  }

  const chapter = await Chapter.findById(chapterId);
  if (!chapter) {
    return next(new AppError('Chapter not found', 404));
  }

  // 2. Fetch lectures to use their transcripts
  const lectures = await Lecture.find({ chapterId }).sort({ order: 1 });
  if (lectures.length === 0) {
    return next(new AppError('Cannot generate quiz. Chapter contains no lectures.', 400));
  }

  // 3. Get or generate quiz
  const quiz = await generateChapterQuiz(chapterId, chapter.title, lectures);

  // 4. Secure quiz: Remove correct answer indexes and explanations from response to prevent cheating
  const studentQuiz = {
    _id: quiz._id,
    chapterId: quiz.chapterId,
    version: quiz.version,
    questions: quiz.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
    })),
  };

  res.status(200).json({
    success: true,
    data: studentQuiz,
  });
});

// @desc    Submit answers for a quiz attempt
// @route   POST /api/v1/quizzes/:id/attempt
// @access  Private
const submitQuizAttempt = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.params; // quiz ID
  const { answers } = req.body; // Array of option indices (Numbers)

  if (!answers || !Array.isArray(answers)) {
    return next(new AppError('Please provide an array of answers', 400));
  }

  const quiz = await Quiz.findById(id);
  if (!quiz) {
    return next(new AppError('Quiz not found', 404));
  }

  // Verify enrollment
  const hasAccess = await verifyCourseEnrollment(quiz.chapterId, req.user.id, req.user.role);
  if (!hasAccess) {
    return next(new AppError('You must be enrolled in this course to submit answers', 403));
  }

  if (answers.length !== quiz.questions.length) {
    return next(
      new AppError(
        `Answer list size mismatch. Quiz has ${quiz.questions.length} questions but got ${answers.length} answers.`,
        400
      )
    );
  }

  // Evaluate scores
  let correctCount = 0;
  const questionsCount = quiz.questions.length;
  
  const results = quiz.questions.map((q, idx) => {
    const selectedOptionIndex = answers[idx];
    const isCorrect = selectedOptionIndex === q.correctOptionIndex;
    
    if (isCorrect) {
      correctCount++;
    }

    return {
      questionText: q.questionText,
      options: q.options,
      selectedOptionIndex,
      correctOptionIndex: q.correctOptionIndex,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const finalScorePercent = Math.round((correctCount / questionsCount) * 100);

  // Record attempt
  const attempt = await QuizAttempt.create({
    studentId: req.user.id,
    quizId: quiz._id,
    score: finalScorePercent,
    answers,
  });

  res.status(201).json({
    success: true,
    data: {
      attemptId: attempt._id,
      score: finalScorePercent,
      correctAnswersCount: correctCount,
      totalQuestionsCount: questionsCount,
      results,
    },
    message: `Quiz completed. You scored ${finalScorePercent}%!`,
  });
});

module.exports = {
  getChapterQuiz,
  submitQuizAttempt,
};
