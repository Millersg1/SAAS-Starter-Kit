import express from 'express';
import { getNotifications, getUnreadCount } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/:brandId', getNotifications);
router.get('/:brandId/count', getUnreadCount);

export default router;
