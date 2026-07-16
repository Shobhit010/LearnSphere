const expressAsyncHandler = require('express-async-handler');
const Lecture = require('../models/Lecture');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const { askLectureAssistant } = require('../services/aiService');

// Helper to check enrollment
const checkEnrollment = async (lectureId, userId, userRole) => {
  if (userRole === 'admin') return true;

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) return false;

  const chapter = await Chapter.findById(lecture.chapterId);
  if (!chapter) return false;

  const course = await Course.findById(chapter.courseId);
  if (!course) return false;

  // Course instructor
  if (course.teacherId.toString() === userId.toString()) return true;

  // Enrolled student
  const enrollment = await Enrollment.findOne({ studentId: userId, courseId: course._id });
  return !!enrollment;
};

// @desc    Ask a question to the AI Video Assistant
// @route   POST /api/v1/ai/lecture/:lectureId/ask
// @access  Private
const askLectureAssistantEndpoint = expressAsyncHandler(async (req, res, next) => {
  const { lectureId } = req.params;
  const { question } = req.body;

  if (!question) {
    return next(new AppError('Please provide a question', 400));
  }

  // 1. Verify access
  const hasAccess = await checkEnrollment(lectureId, req.user.id, req.user.role);
  if (!hasAccess) {
    return next(new AppError('You must be enrolled in this course to use the AI Video Assistant', 403));
  }

  // 2. Fetch lecture
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    return next(new AppError('Lecture not found', 404));
  }

  // 3. Ask AI service
  const answer = await askLectureAssistant(
    lecture._id,
    lecture.title,
    lecture.transcript,
    question
  );

  res.status(200).json({
    success: true,
    data: {
      answer,
    },
  });
});

module.exports = {
  askLectureAssistantEndpoint,
};
