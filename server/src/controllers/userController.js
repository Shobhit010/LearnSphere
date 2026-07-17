const expressAsyncHandler = require('express-async-handler');
const User = require('../models/User');
const AppError = require('../utils/AppError');

// @desc    Get all users (Admin only)
// @route   GET /api/v1/users
// @access  Private/Admin
const getUsers = expressAsyncHandler(async (req, res, next) => {
  const users = await User.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: users,
  });
});

// @desc    Update user profile
// @route   PATCH /api/v1/users/profile
// @access  Private
const updateProfile = expressAsyncHandler(async (req, res, next) => {
  const { name, bio, avatar } = req.body;

  const fieldsToUpdate = {};
  if (name) fieldsToUpdate.name = name;
  if (bio !== undefined) fieldsToUpdate.bio = bio;
  if (avatar !== undefined) fieldsToUpdate.avatar = avatar;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: fieldsToUpdate },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Toggle user suspension (Admin only)
// @route   PATCH /api/v1/users/:id/suspend
// @access  Private/Admin
const toggleSuspendUser = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === 'admin') {
    return next(new AppError('Admins cannot be suspended', 400));
  }

  user.isSuspended = !user.isSuspended;
  await user.save();

  // If user is suspended, clear their refresh token session
  if (user.isSuspended) {
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
  }

  res.status(200).json({
    success: true,
    data: user,
    message: `User has been ${user.isSuspended ? 'suspended' : 'unsuspended'}`,
  });
});

// Teacher approval removed; endpoint retained as a no-op compatibility path.
const approveTeacher = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role !== 'teacher') {
    return next(new AppError('User is not registered as a teacher', 400));
  }

  user.isApprovedTeacher = true;
  await user.save();

  res.status(200).json({
    success: true,
    data: user,
    message: 'Teacher approval is no longer required',
  });
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
const deleteUser = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === 'admin') {
    return next(new AppError('Admins cannot be deleted', 400));
  }

  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {},
    message: 'User deleted successfully',
  });
});

module.exports = {
  getUsers,
  updateProfile,
  toggleSuspendUser,
  approveTeacher,
  deleteUser,
};
