const express = require('express');
const {
  getUsers,
  updateProfile,
  toggleSuspendUser,
  approveTeacher,
  deleteUser,
} = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

// Profile updates for logged in users
router.patch('/profile', protect, updateProfile);

// Admin-only user management routes retained for legacy support
router.use(protect, restrictTo('admin'));

router.route('/')
  .get(getUsers);

router.route('/:id')
  .delete(deleteUser);

router.patch('/:id/suspend', toggleSuspendUser);
router.patch('/:id/approve-teacher', approveTeacher);

module.exports = router;
