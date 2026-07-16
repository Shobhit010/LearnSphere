const expressAsyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
const getNotifications = expressAsyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50); // limit to last 50 notifications

  res.status(200).json({
    success: true,
    data: notifications,
  });
});

// @desc    Get unread notifications count
// @route   GET /api/v1/notifications/unread-count
// @access  Private
const getUnreadCount = expressAsyncHandler(async (req, res, next) => {
  const count = await Notification.countDocuments({
    userId: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    data: { count },
  });
});

// @desc    Mark notifications as read (single or all)
// @route   PATCH /api/v1/notifications/mark-read
// @access  Private
const markNotificationsRead = expressAsyncHandler(async (req, res, next) => {
  const { notificationId } = req.body;

  if (notificationId) {
    // Mark a single notification as read
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return next(new AppError('Notification not found', 404));
    }
    if (notification.userId.toString() !== req.user.id.toString()) {
      return next(new AppError('Unauthorized', 401));
    }

    notification.isRead = true;
    await notification.save();
  } else {
    // Mark all user notifications as read
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Notifications marked as read',
  });
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
};
