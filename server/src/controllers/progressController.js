const expressAsyncHandler = require('express-async-handler');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const { generateCertificate } = require('../services/certificateService');

// @desc    Get progress details for a course
// @route   GET /api/v1/progress/course/:courseId
// @access  Private
const getCourseProgress = expressAsyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  // Check enrollment
  const enrollment = await Enrollment.findOne({
    studentId: req.user.id,
    courseId,
  });

  if (!enrollment && req.user.role !== 'admin') {
    return next(new AppError('You are not enrolled in this course', 403));
  }

  let progress = await Progress.findOne({
    studentId: req.user.id,
    courseId,
  });

  if (!progress) {
    // Initialize progress if enrolled but progress record doesn't exist yet
    progress = await Progress.create({
      studentId: req.user.id,
      courseId,
      completedLectures: [],
      percentComplete: 0,
    });
  }

  res.status(200).json({
    success: true,
    data: progress,
  });
});

// @desc    Update progress (Mark lecture complete/incomplete & last accessed)
// @route   PATCH /api/v1/progress/course/:courseId/lecture/:lectureId
// @access  Private
const updateLectureProgress = expressAsyncHandler(async (req, res, next) => {
  const { courseId, lectureId } = req.params;
  const { completed } = req.body; // boolean

  // Verify enrollment
  const enrollment = await Enrollment.findOne({
    studentId: req.user.id,
    courseId,
  });

  if (!enrollment) {
    return next(new AppError('You are not enrolled in this course', 403));
  }

  // Verify lecture belongs to this course
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    return next(new AppError('Lecture not found', 404));
  }

  const chapter = await Chapter.findById(lecture.chapterId);
  if (!chapter || chapter.courseId.toString() !== courseId.toString()) {
    return next(new AppError('Lecture does not belong to this course', 400));
  }

  // Find or create progress record
  let progress = await Progress.findOne({
    studentId: req.user.id,
    courseId,
  });

  if (!progress) {
    progress = new Progress({
      studentId: req.user.id,
      courseId,
      completedLectures: [],
    });
  }

  // Update completed lectures array
  const isAlreadyCompleted = progress.completedLectures.includes(lectureId);

  if (completed && !isAlreadyCompleted) {
    progress.completedLectures.push(lectureId);
  } else if (!completed && isAlreadyCompleted) {
    progress.completedLectures = progress.completedLectures.filter(
      (id) => id.toString() !== lectureId.toString()
    );
  }

  // Set last accessed lecture
  progress.lastAccessedLecture = lectureId;

  // Calculate completion percentage
  const chapters = await Chapter.find({ courseId }).select('_id');
  const chapterIds = chapters.map((c) => c._id);
  const totalLecturesCount = await Lecture.countDocuments({
    chapterId: { $in: chapterIds },
  });

  progress.percentComplete =
    totalLecturesCount > 0
      ? Math.round((progress.completedLectures.length / totalLecturesCount) * 100)
      : 0;

  await progress.save();

  // If progress is 100%, trigger certificate generation
  let certificate = null;
  if (progress.percentComplete === 100) {
    const course = await Course.findById(courseId);
    try {
      certificate = await generateCertificate(req.user, course);
    } catch (certError) {
      console.error('Error generating certificate inside progress trigger:', certError.message);
      // Don't crash request if certificate fails, return progress anyway
    }
  }

  res.status(200).json({
    success: true,
    data: {
      progress,
      certificateGenerated: progress.percentComplete === 100,
      certificate,
    },
    message: 'Progress updated successfully',
  });
});

module.exports = {
  getCourseProgress,
  updateLectureProgress,
};
