const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/mark-read', markNotificationsRead);

module.exports = router;
