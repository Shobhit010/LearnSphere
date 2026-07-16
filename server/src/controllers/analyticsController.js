const expressAsyncHandler = require('express-async-handler');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');

// Platform commission rate (20%)
const COMMISSION_RATE = 0.20;

// @desc    Get analytics for Teacher Dashboard
// @route   GET /api/v1/analytics/teacher
// @access  Private/Teacher
const getTeacherAnalytics = expressAsyncHandler(async (req, res, next) => {
  // Find all courses created by this teacher
  const courses = await Course.find({ teacherId: req.user.id, isDeleted: false });
  const courseIds = courses.map((c) => c._id);

  if (courseIds.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        totalCourses: 0,
        totalEnrollments: 0,
        grossRevenue: 0,
        netRevenue: 0,
        averageRating: 0,
        completionRate: 0,
        coursePerformance: [],
      },
    });
  }

  // 1. Total Enrollments
  const totalEnrollments = await Enrollment.countDocuments({ courseId: { $in: courseIds } });

  // 2. Revenues
  const payments = await Payment.find({ courseId: { $in: courseIds }, status: 'succeeded' });
  const grossRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const netRevenue = grossRevenue * (1 - COMMISSION_RATE);

  // 3. Average Rating
  const reviews = await Review.find({ courseId: { $in: courseIds } });
  const averageRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

  // 4. Completion Rate of Enrolled Students
  const progresses = await Progress.find({ courseId: { $in: courseIds } });
  const completionRate =
    progresses.length > 0
      ? Math.round(
          (progresses.filter((p) => p.percentComplete === 100).length / progresses.length) * 100
        )
      : 0;

  // 5. Per-Course breakdown
  const coursePerformance = await Promise.all(
    courses.map(async (c) => {
      const courseEnrollments = await Enrollment.countDocuments({ courseId: c._id });
      const coursePayments = payments.filter((p) => p.courseId.toString() === c._id.toString());
      const courseGross = coursePayments.reduce((sum, p) => sum + p.amount, 0);
      const courseNet = courseGross * (1 - COMMISSION_RATE);
      
      const courseReviews = reviews.filter((r) => r.courseId.toString() === c._id.toString());
      const courseAvgRating =
        courseReviews.length > 0
          ? Math.round((courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length) * 10) / 10
          : 0;

      return {
        courseId: c._id,
        title: c.title,
        status: c.status,
        price: c.price,
        enrollments: courseEnrollments,
        grossRevenue: Math.round(courseGross * 100) / 100,
        netRevenue: Math.round(courseNet * 100) / 100,
        rating: courseAvgRating,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      totalCourses: courses.length,
      totalEnrollments,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      averageRating,
      completionRate,
      coursePerformance,
    },
  });
});

// @desc    Get analytics for Student Dashboard
// @route   GET /api/v1/analytics/student
// @access  Private
const getStudentAnalytics = expressAsyncHandler(async (req, res, next) => {
  const studentId = req.user.id;

  // 1. Enrolled courses and completed count
  const totalEnrolled = await Enrollment.countDocuments({ studentId });
  
  const progresses = await Progress.find({ studentId }).populate({
    path: 'courseId',
    select: 'title category price thumbnail',
  });
  
  const completedCount = progresses.filter((p) => p.percentComplete === 100).length;

  // 2. Calculate Total watched time (estimate based on completed lectures duration)
  let totalSecondsWatched = 0;
  
  for (const progress of progresses) {
    const Lecture = require('../models/Lecture');
    const lectures = await Lecture.find({ _id: { $in: progress.completedLectures } }).select('duration');
    totalSecondsWatched += lectures.reduce((sum, l) => sum + (l.duration || 0), 0);
  }

  const totalHoursWatched = Math.round((totalSecondsWatched / 3600) * 10) / 10;

  // 3. Category Breakdown (Skill/Category distribution of enrolled courses)
  const categoryMap = {};
  progresses.forEach((p) => {
    if (p.courseId && p.courseId.category) {
      const cat = p.courseId.category;
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
  });

  const categoryBreakdown = Object.keys(categoryMap).map((key) => ({
    category: key,
    count: categoryMap[key],
  }));

  res.status(200).json({
    success: true,
    data: {
      enrolledCoursesCount: totalEnrolled,
      completedCoursesCount: completedCount,
      totalHoursWatched,
      categoryBreakdown,
      learningStreakDays: 3, // Mock learning streak to keep UI dynamic
    },
  });
});

// @desc    Get analytics for Admin Dashboard
// @route   GET /api/v1/analytics/admin
// @access  Private/Admin
const getAdminAnalytics = expressAsyncHandler(async (req, res, next) => {
  // 1. User counts
  const totalUsers = await User.countDocuments({});
  const totalStudents = await User.countDocuments({ role: 'student' });
  const totalTeachers = await User.countDocuments({ role: 'teacher' });

  // 2. Course counts
  const totalCourses = await Course.countDocuments({ isDeleted: false });
  const publishedCourses = await Course.countDocuments({ status: 'published', isDeleted: false });
  const pendingCourses = await Course.countDocuments({ status: 'pending', isDeleted: false });

  // 3. Platform Revenue
  const payments = await Payment.find({ status: 'succeeded' });
  const totalGrossRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const platformEarnings = totalGrossRevenue * COMMISSION_RATE; // 20% platform commission

  // 4. Top performing courses (by enrollment count)
  const topCourses = await Course.find({ isDeleted: false })
    .sort({ enrollmentCount: -1 })
    .limit(5)
    .populate('teacherId', 'name');

  const formattedTopCourses = topCourses.map((c) => ({
    courseId: c._id,
    title: c.title,
    teacherName: c.teacherId ? c.teacherId.name : 'Unknown',
    enrollments: c.enrollmentCount,
    rating: c.ratingsAvg,
    revenue: Math.round(c.enrollmentCount * c.price * 100) / 100,
  }));

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        students: totalStudents,
        teachers: totalTeachers,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        pending: pendingCourses,
      },
      revenue: {
        totalGross: Math.round(totalGrossRevenue * 100) / 100,
        platformEarnings: Math.round(platformEarnings * 100) / 100,
      },
      topCourses: formattedTopCourses,
    },
  });
});

module.exports = {
  getTeacherAnalytics,
  getStudentAnalytics,
  getAdminAnalytics,
};
