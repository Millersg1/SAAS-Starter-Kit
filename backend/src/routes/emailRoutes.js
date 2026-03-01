import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as emailController from '../controllers/emailController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId/threads',                   emailController.listThreads);
router.get('/:brandId/threads/:threadId',          emailController.getThread);
router.post('/:brandId/threads/:threadId/reply',   emailController.sendReply);
router.get('/:brandId/unread-count',               emailController.getUnreadCount);

export default router;
