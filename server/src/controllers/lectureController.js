const expressAsyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const { extractYoutubeId } = require('../utils/youtube');
const { uploadToCloudinary } = require('../config/cloudinary');

// Helper to check if a user is the owner of the course
const isCourseOwnerByChapter = async (chapterId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) return false;
  const course = await Course.findById(chapter.courseId);
  return course && course.teacherId.toString() === userId.toString();
};

const isCourseOwnerByLecture = async (lectureId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) return false;
  return isCourseOwnerByChapter(lecture.chapterId, userId, userRole);
};

// @desc    Create a new lecture inside a chapter
// @route   POST /api/v1/lectures
// @access  Private/Teacher
const createLecture = expressAsyncHandler(async (req, res, next) => {
  const { title, chapterId, youtubeUrl, duration, isPreviewFree, transcript } = req.body;

  if (!title || !chapterId || !youtubeUrl) {
    return next(new AppError('Please provide a lecture title, chapterId, and YouTube URL/ID', 400));
  }

  // Verify chapter and course ownership
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) {
    return next(new AppError('Chapter not found', 404));
  }

  const isOwner = await isCourseOwnerByChapter(chapterId, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  // Extract YouTube Video ID
  const youtubeVideoId = extractYoutubeId(youtubeUrl);
  if (!youtubeVideoId) {
    return next(new AppError('Invalid YouTube URL or Video ID', 400));
  }

  // Calculate order
  const lastLecture = await Lecture.findOne({ chapterId }).sort({ order: -1 });
  const order = lastLecture ? lastLecture.order + 1 : 1;

  const lecture = await Lecture.create({
    title,
    order,
    chapterId,
    youtubeVideoId,
    duration: duration || 0,
    isPreviewFree: !!isPreviewFree,
    transcript: transcript || '',
    resources: [],
  });

  res.status(201).json({
    success: true,
    data: lecture,
    message: 'Lecture created successfully',
  });
});

// @desc    Get lectures of a chapter (Requires enrollment / ownership / admin)
// @route   GET /api/v1/lectures/chapter/:chapterId
// @access  Private (Students/Teachers/Admins)
const getLecturesByChapter = expressAsyncHandler(async (req, res, next) => {
  const { chapterId } = req.params;

  const chapter = await Chapter.findById(chapterId);
  if (!chapter) {
    return next(new AppError('Chapter not found', 404));
  }

  // Access checks
  let hasAccess = false;

  if (req.user.role === 'admin') {
    hasAccess = true;
  } else {
    // Check if user is the course teacher
    const isOwner = await isCourseOwnerByChapter(chapterId, req.user.id, req.user.role);
    if (isOwner) {
      hasAccess = true;
    } else {
      // Check if user is enrolled
      const enrollment = await Enrollment.findOne({
        studentId: req.user.id,
        courseId: chapter.courseId,
      });
      if (enrollment) {
        hasAccess = true;
      }
    }
  }

  // Fetch lectures. Non-enrolled users/guests can only see preview lectures.
  // Since this endpoint requires login, we verify access.
  const lectures = await Lecture.find({ chapterId }).sort({ order: 1 });

  if (!hasAccess) {
    // Find all chapters of the course to check first chapter's first lecture
    const courseChapters = await Chapter.find({ courseId: chapter.courseId }).sort({ order: 1 });
    const courseChapterIds = courseChapters.map((c) => c._id);

    // Check if any lecture in the entire course has isPreviewFree: true
    const anyExplicitPreview = await Lecture.findOne({
      chapterId: { $in: courseChapterIds },
      isPreviewFree: true,
    });

    let firstLectureId = null;
    if (!anyExplicitPreview) {
      // Find the first lecture of the first chapter that has lectures
      for (const chId of courseChapterIds) {
        const firstLec = await Lecture.findOne({ chapterId: chId }).sort({ order: 1 });
        if (firstLec) {
          firstLectureId = firstLec._id.toString();
          break;
        }
      }
    }

    // Filter out content for non-enrolled students
    const filteredLectures = lectures.map((lec) => {
      const isPreview = lec.isPreviewFree || (firstLectureId && lec._id.toString() === firstLectureId);
      if (isPreview) {
        if (!lec.isPreviewFree) {
          const lecObj = lec.toObject();
          lecObj.isPreviewFree = true;
          return lecObj;
        }
        return lec;
      }
      // Mask sensitive fields
      const masked = lec.toObject();
      masked.youtubeVideoId = 'LOCKED';
      masked.resources = [];
      masked.transcript = '';
      return masked;
    });

    return res.status(200).json({
      success: true,
      data: filteredLectures,
      message: 'Limited preview view. Enroll to unlock full lectures.',
    });
  }

  res.status(200).json({
    success: true,
    data: lectures,
  });
});

// @desc    Update a lecture
// @route   PATCH /api/v1/lectures/:id
// @access  Private/Teacher
const updateLecture = expressAsyncHandler(async (req, res, next) => {
  const { title, youtubeUrl, duration, isPreviewFree, transcript } = req.body;
  const lecture = await Lecture.findById(req.params.id);

  if (!lecture) {
    return next(new AppError('Lecture not found', 404));
  }

  const isOwner = await isCourseOwnerByLecture(lecture._id, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  const updateFields = {};
  if (title) updateFields.title = title;
  if (duration !== undefined) updateFields.duration = duration;
  if (isPreviewFree !== undefined) updateFields.isPreviewFree = !!isPreviewFree;
  if (transcript !== undefined) updateFields.transcript = transcript;

  if (youtubeUrl) {
    const youtubeVideoId = extractYoutubeId(youtubeUrl);
    if (!youtubeVideoId) {
      return next(new AppError('Invalid YouTube URL or Video ID', 400));
    }
    updateFields.youtubeVideoId = youtubeVideoId;
  }

  const updatedLecture = await Lecture.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: updatedLecture,
    message: 'Lecture updated successfully',
  });
});

// @desc    Delete a lecture
// @route   DELETE /api/v1/lectures/:id
// @access  Private/Teacher
const deleteLecture = expressAsyncHandler(async (req, res, next) => {
  const lecture = await Lecture.findById(req.params.id);

  if (!lecture) {
    return next(new AppError('Lecture not found', 404));
  }

  const isOwner = await isCourseOwnerByLecture(lecture._id, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  await Lecture.findByIdAndDelete(lecture._id);

  // Recalculate ordering
  const remainingLectures = await Lecture.find({ chapterId: lecture.chapterId }).sort({ order: 1 });
  for (let i = 0; i < remainingLectures.length; i++) {
    remainingLectures[i].order = i + 1;
    await remainingLectures[i].save();
  }

  res.status(200).json({
    success: true,
    data: {},
    message: 'Lecture deleted successfully',
  });
});

// @desc    Reorder lectures within a chapter
// @route   PATCH /api/v1/lectures/reorder
// @access  Private/Teacher
const reorderLectures = expressAsyncHandler(async (req, res, next) => {
  const { items } = req.body; // Array of { _id, order }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError('Please provide an array of items to reorder', 400));
  }

  const sampleLecture = await Lecture.findById(items[0]._id);
  if (!sampleLecture) {
    return next(new AppError('Invalid lecture data', 400));
  }

  const isOwner = await isCourseOwnerByLecture(sampleLecture._id, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item._id },
      update: { $set: { order: item.order } },
    },
  }));

  await Lecture.bulkWrite(bulkOps);

  res.status(200).json({
    success: true,
    message: 'Lectures reordered successfully',
  });
});

// @desc    Add resource file / link to lecture
// @route   POST /api/v1/lectures/:id/resources
// @access  Private/Teacher
const addResource = expressAsyncHandler(async (req, res, next) => {
  const lecture = await Lecture.findById(req.params.id);

  if (!lecture) {
    return next(new AppError('Lecture not found', 404));
  }

  const isOwner = await isCourseOwnerByLecture(lecture._id, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  const { type, fileName, linkUrl } = req.body;

  let resourceUrl = '';
  let resourceSize = 0;
  let resourceName = fileName || 'Resource';

  if (type === 'link') {
    if (!linkUrl) {
      return next(new AppError('Please provide a URL link for this resource', 400));
    }
    resourceUrl = linkUrl;
  } else {
    // Check uploaded file
    if (!req.file) {
      return next(new AppError('Please upload a file for type ' + type, 400));
    }
    
    // Upload to Cloudinary / Local
    const uploadResult = await uploadToCloudinary(req.file.path, 'lecture_resources');
    resourceUrl = uploadResult.url;
    resourceSize = req.file.size;
    resourceName = fileName || req.file.originalname;
  }

  // Push resource to resources array
  lecture.resources.push({
    type,
    url: resourceUrl,
    fileName: resourceName,
    size: resourceSize,
  });

  await lecture.save();

  res.status(200).json({
    success: true,
    data: lecture,
    message: 'Resource added successfully',
  });
});

// @desc    Delete resource from lecture
// @route   DELETE /api/v1/lectures/:id/resources/:resourceId
// @access  Private/Teacher
const deleteResource = expressAsyncHandler(async (req, res, next) => {
  const lecture = await Lecture.findById(req.params.id);

  if (!lecture) {
    return next(new AppError('Lecture not found', 404));
  }

  const isOwner = await isCourseOwnerByLecture(lecture._id, req.user.id, req.user.role);
  if (!isOwner) {
    return next(new AppError('You do not have permission to modify this course', 403));
  }

  const { resourceId } = req.params;

  // Filter out the resource
  const resourceIndex = lecture.resources.findIndex((r) => r._id.toString() === resourceId);
  if (resourceIndex === -1) {
    return next(new AppError('Resource not found in this lecture', 404));
  }

  lecture.resources.splice(resourceIndex, 1);
  await lecture.save();

  res.status(200).json({
    success: true,
    data: lecture,
    message: 'Resource deleted successfully',
  });
});

module.exports = {
  createLecture,
  getLecturesByChapter,
  updateLecture,
  deleteLecture,
  reorderLectures,
  addResource,
  deleteResource,
};
