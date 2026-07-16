const expressAsyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const AppError = require('../utils/AppError');
const { uploadToCloudinary } = require('../config/cloudinary');

// Helper to check if a user is the owner of the course
const isCourseOwner = async (courseId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const course = await Course.findById(courseId);
  return course && course.teacherId.toString() === userId.toString();
};

// @desc    Create a new course (Approved Teachers only)
// @route   POST /api/v1/courses
// @access  Private/Teacher
const createCourse = expressAsyncHandler(async (req, res, next) => {
  const { title, subtitle, description, category, subcategory, level, language, price, tags } = req.body;

  // Check if teacher is approved
  if (req.user.role === 'teacher' && !req.user.isApprovedTeacher) {
    return next(new AppError('Your teacher profile is pending admin approval. You cannot create courses yet.', 403));
  }

  const course = await Course.create({
    title,
    subtitle,
    description,
    category,
    subcategory,
    level,
    language,
    price,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
    teacherId: req.user.id,
    status: 'draft',
  });

  res.status(201).json({
    success: true,
    data: course,
    message: 'Course draft created successfully',
  });
});

// @desc    Get courses with filters, search, sorting & pagination (Public)
// @route   GET /api/v1/courses
// @access  Public
const getCourses = expressAsyncHandler(async (req, res, next) => {
  const {
    search,
    category,
    level,
    priceRange,
    rating,
    sort,
    page = 1,
    limit = 10,
    teacherId,
  } = req.query;

  // Build filter query object
  const query = { isDeleted: false };

  // If public view, only show published courses. Admin & Teacher can see their drafts/pendings
  if (req.query.myCourses !== 'true' && req.user?.role !== 'admin') {
    query.status = 'published';
  } else if (req.query.myCourses === 'true' && req.user) {
    if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    } else if (req.user.role === 'student') {
      // For students, find their enrolled courses
      const enrollments = await Enrollment.find({ studentId: req.user.id });
      const courseIds = enrollments.map((e) => e.courseId);
      query._id = { $in: courseIds };
    }
  }

  // Apply filters
  if (teacherId) {
    query.teacherId = teacherId;
  }
  if (category) {
    query.category = category;
  }
  if (level) {
    query.level = level;
  }
  if (rating) {
    query.ratingsAvg = { $gte: parseFloat(rating) };
  }
  if (priceRange) {
    const [min, max] = priceRange.split('-');
    query.price = {};
    if (min) query.price.$gte = parseFloat(min);
    if (max) query.price.$lte = parseFloat(max);
  }

  // Full-text search
  if (search) {
    query.$text = { $search: search };
  }

  // Setup Sorting
  let sortBy = { createdAt: -1 }; // Default: Newest
  if (sort) {
    switch (sort) {
      case 'popularity':
        sortBy = { enrollmentCount: -1 };
        break;
      case 'newest':
        sortBy = { createdAt: -1 };
        break;
      case 'price-low':
        sortBy = { price: 1 };
        break;
      case 'price-high':
        sortBy = { price: -1 };
        break;
      case 'rating':
        sortBy = { ratingsAvg: -1 };
        break;
      default:
        sortBy = { createdAt: -1 };
    }
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const total = await Course.countDocuments(query);
  const courses = await Course.find(query)
    .populate('teacherId', 'name avatar')
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  const pages = Math.ceil(total / limitNum);

  res.status(200).json({
    success: true,
    data: courses,
    meta: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
    },
  });
});

// @desc    Get single course details by ID (Public/Private)
// @route   GET /api/v1/courses/:id
// @access  Public
const getCourseById = expressAsyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id)
    .populate('teacherId', 'name avatar bio');

  if (!course || course.isDeleted) {
    return next(new AppError('Course not found', 404));
  }

  // Check draft view restrictions
  if (course.status !== 'published') {
    const isOwner = req.user && (await isCourseOwner(course._id, req.user.id, req.user.role));
    if (!isOwner) {
      return next(new AppError('This course is not published yet and is unavailable.', 403));
    }
  }

  // Fetch Chapters & Lectures (curriculum)
  const chapters = await Chapter.find({ courseId: course._id }).sort({ order: 1 });
  
  // Package curriculum with lectures
  const curriculum = await Promise.all(
    chapters.map(async (chapter) => {
      const lectures = await Lecture.find({ chapterId: chapter._id })
        .sort({ order: 1 })
        .select('-transcript'); // Don't send large transcript over public course view

      return {
        _id: chapter._id,
        title: chapter.title,
        order: chapter.order,
        lectures,
      };
    })
  );

  // Check enrollment if logged in
  let isEnrolled = false;
  let progressPercent = 0;
  if (req.user) {
    const enrollment = await Enrollment.findOne({
      studentId: req.user.id,
      courseId: course._id,
    });
    isEnrolled = !!enrollment;

    if (isEnrolled) {
      const progress = await Progress.findOne({
        studentId: req.user.id,
        courseId: course._id,
      });
      progressPercent = progress ? progress.percentComplete : 0;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      course,
      curriculum,
      isEnrolled,
      progressPercent,
    },
  });
});

// @desc    Update a course
// @route   PATCH /api/v1/courses/:id
// @access  Private/Teacher
const updateCourse = expressAsyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id);

  if (!course || course.isDeleted) {
    return next(new AppError('Course not found', 404));
  }

  const isOwner = await isCourseOwner(course._id, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  const { title, subtitle, description, category, subcategory, level, language, price, discountedPrice, discountValidTill, tags } = req.body;

  const updateFields = {};
  if (title) updateFields.title = title;
  if (subtitle !== undefined) updateFields.subtitle = subtitle;
  if (description) updateFields.description = description;
  if (category) updateFields.category = category;
  if (subcategory !== undefined) updateFields.subcategory = subcategory;
  if (level) updateFields.level = level;
  if (language) updateFields.language = language;
  if (price !== undefined) updateFields.price = price;
  if (discountedPrice !== undefined) updateFields.discountedPrice = discountedPrice;
  if (discountValidTill !== undefined) updateFields.discountValidTill = discountValidTill;
  if (tags) updateFields.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

  // Reset status to draft if edited from rejected (to let teachers resubmit)
  if (course.status === 'rejected') {
    updateFields.status = 'draft';
  }

  course = await Course.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: course,
    message: 'Course updated successfully',
  });
});

// @desc    Upload Course Thumbnail
// @route   PATCH /api/v1/courses/:id/thumbnail
// @access  Private/Teacher
const uploadCourseThumbnail = expressAsyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a thumbnail file', 400));
  }

  const course = await Course.findById(req.params.id);
  if (!course || course.isDeleted) {
    return next(new AppError('Course not found', 404));
  }

  const isOwner = await isCourseOwner(course._id, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  // Upload to Cloudinary (or local fallback)
  const uploadResult = await uploadToCloudinary(req.file.path, 'course_thumbnails');

  course.thumbnail = uploadResult.url;
  await course.save();

  res.status(200).json({
    success: true,
    data: course,
    message: 'Course thumbnail uploaded successfully',
  });
});

// @desc    Submit course for review (Teacher sets to pending)
// @route   PATCH /api/v1/courses/:id/submit
// @access  Private/Teacher
const submitCourseForReview = expressAsyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course || course.isDeleted) {
    return next(new AppError('Course not found', 404));
  }

  const isOwner = await isCourseOwner(course._id, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to submit this course', 403));
  }

  if (course.status !== 'draft') {
    return next(new AppError(`Only draft courses can be submitted. Current status: ${course.status}`, 400));
  }

  // Check if course has curriculum (at least one chapter and one lecture)
  const chapterCount = await Chapter.countDocuments({ courseId: course._id });
  if (chapterCount === 0) {
    return next(new AppError('Cannot submit course. Add at least one chapter.', 400));
  }

  course.status = 'pending';
  await course.save();

  res.status(200).json({
    success: true,
    data: course,
    message: 'Course submitted for admin review successfully',
  });
});

// @desc    Approve or Reject a course (Admin only)
// @route   PATCH /api/v1/courses/:id/review
// @access  Private/Admin
const approveOrRejectCourse = expressAsyncHandler(async (req, res, next) => {
  const { action, feedback } = req.body; // 'approve' or 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return next(new AppError('Invalid action. Use approve or reject', 400));
  }

  const course = await Course.findById(req.params.id);
  if (!course || course.isDeleted) {
    return next(new AppError('Course not found', 404));
  }

  if (course.status !== 'pending') {
    return next(new AppError('Only pending courses can be reviewed', 400));
  }

  course.status = action === 'approve' ? 'published' : 'rejected';
  await course.save();

  // Here, trigger in-app notification to the teacher
  const Notification = require('../models/Notification');
  await Notification.create({
    userId: course.teacherId,
    type: 'course_approval',
    message: `Your course "${course.title}" has been ${action === 'approve' ? 'approved & published' : 'rejected by the review team'}. ${feedback ? 'Feedback: ' + feedback : ''}`,
    link: `/teacher/courses/${course._id}`,
  });

  res.status(200).json({
    success: true,
    data: course,
    message: `Course has been successfully ${course.status}`,
  });
});

// @desc    Soft Delete course (Teacher/Admin)
// @route   DELETE /api/v1/courses/:id
// @access  Private/Teacher
const deleteCourse = expressAsyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course || course.isDeleted) {
    return next(new AppError('Course not found', 404));
  }

  const isOwner = await isCourseOwner(course._id, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to delete this course', 403));
  }

  course.isDeleted = true;
  await course.save();

  res.status(200).json({
    success: true,
    data: {},
    message: 'Course deleted successfully',
  });
});

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  uploadCourseThumbnail,
  submitCourseForReview,
  approveOrRejectCourse,
  deleteCourse,
};
