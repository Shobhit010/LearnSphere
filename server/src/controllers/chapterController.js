const expressAsyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Lecture = require('../models/Lecture');
const AppError = require('../utils/AppError');

// Helper to check if a user is the owner of the course
const isCourseOwner = async (courseId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const course = await Course.findById(courseId);
  return course && course.teacherId.toString() === userId.toString();
};

// @desc    Create a new chapter inside a course
// @route   POST /api/v1/chapters
// @access  Private/Teacher
const createChapter = expressAsyncHandler(async (req, res, next) => {
  const { title, courseId } = req.body;

  if (!title || !courseId) {
    return next(new AppError('Please provide a chapter title and courseId', 400));
  }

  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) {
    return next(new AppError('Course not found', 404));
  }

  // Verify ownership
  const isOwner = await isCourseOwner(courseId, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  // Calculate order (next number)
  const lastChapter = await Chapter.findOne({ courseId }).sort({ order: -1 });
  const order = lastChapter ? lastChapter.order + 1 : 1;

  const chapter = await Chapter.create({
    title,
    order,
    courseId,
  });

  res.status(201).json({
    success: true,
    data: chapter,
    message: 'Chapter created successfully',
  });
});

// @desc    Get all chapters for a course
// @route   GET /api/v1/chapters/course/:courseId
// @access  Public
const getChaptersByCourse = expressAsyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  const chapters = await Chapter.find({ courseId }).sort({ order: 1 });

  res.status(200).json({
    success: true,
    data: chapters,
  });
});

// @desc    Update a chapter
// @route   PATCH /api/v1/chapters/:id
// @access  Private/Teacher
const updateChapter = expressAsyncHandler(async (req, res, next) => {
  const { title } = req.body;
  const chapter = await Chapter.findById(req.params.id);

  if (!chapter) {
    return next(new AppError('Chapter not found', 404));
  }

  const isOwner = await isCourseOwner(chapter.courseId, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  chapter.title = title || chapter.title;
  await chapter.save();

  res.status(200).json({
    success: true,
    data: chapter,
    message: 'Chapter updated successfully',
  });
});

// @desc    Delete a chapter (and cascade delete its lectures)
// @route   DELETE /api/v1/chapters/:id
// @access  Private/Teacher
const deleteChapter = expressAsyncHandler(async (req, res, next) => {
  const chapter = await Chapter.findById(req.params.id);

  if (!chapter) {
    return next(new AppError('Chapter not found', 404));
  }

  const isOwner = await isCourseOwner(chapter.courseId, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  // Cascade delete all lectures associated with this chapter
  await Lecture.deleteMany({ chapterId: chapter._id });

  // Delete the chapter
  await Chapter.findByIdAndDelete(chapter._id);

  // Recalculate ordering for the rest of the chapters
  const remainingChapters = await Chapter.find({ courseId: chapter.courseId }).sort({ order: 1 });
  for (let i = 0; i < remainingChapters.length; i++) {
    remainingChapters[i].order = i + 1;
    await remainingChapters[i].save();
  }

  res.status(200).json({
    success: true,
    data: {},
    message: 'Chapter and its associated lectures deleted successfully',
  });
});

// @desc    Reorder chapters (Bulk update order)
// @route   PATCH /api/v1/chapters/reorder
// @access  Private/Teacher
const reorderChapters = expressAsyncHandler(async (req, res, next) => {
  const { items } = req.body; // Array of { _id, order }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError('Please provide an array of items to reorder', 400));
  }

  // Get the first chapter to check ownership
  const sampleChapter = await Chapter.findById(items[0]._id);
  if (!sampleChapter) {
    return next(new AppError('Invalid chapter data', 400));
  }

  const isOwner = await isCourseOwner(sampleChapter.courseId, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  // Perform bulk update of orders
  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item._id },
      update: { $set: { order: item.order } },
    },
  }));

  await Chapter.bulkWrite(bulkOps);

  res.status(200).json({
    success: true,
    message: 'Chapters reordered successfully',
  });
});

module.exports = {
  createChapter,
  getChaptersByCourse,
  updateChapter,
  deleteChapter,
  reorderChapters,
};
