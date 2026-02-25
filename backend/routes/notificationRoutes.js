import express from 'express';
import {
  createNotification,
  getNotifications,
  markNotificationRead,
} from '../controllers/notificationController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/', getNotifications);
router.post('/', createNotification);
router.patch('/:id/read', markNotificationRead);

export default router;
