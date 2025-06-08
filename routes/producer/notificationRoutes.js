import express from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationsCount
} from '../../controllers/producer/producerController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected and require producer role
router.use(protect);
router.use(authorize('producer'));

// Get all notifications
router.get('/', getNotifications);

// Get unread notifications count
router.get('/unread-count', getUnreadNotificationsCount);

// Mark single notification as read
router.patch('/:notificationId/read', markNotificationAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', markAllNotificationsAsRead);

export default router; 