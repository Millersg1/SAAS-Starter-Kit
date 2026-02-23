import express from 'express';
import * as messageController from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// MESSAGE THREADS
// ============================================

// Create new thread
router.post(
  '/:brandId/threads',
  messageController.createThread
);

// Get all threads for a brand
router.get(
  '/:brandId/threads',
  messageController.getBrandThreads
);

// Get single thread
router.get(
  '/:brandId/threads/:threadId',
  messageController.getThread
);

// Update thread
router.patch(
  '/:brandId/threads/:threadId',
  messageController.updateThread
);

// Archive thread
router.delete(
  '/:brandId/threads/:threadId',
  messageController.archiveThread
);

// Get thread participants
router.get(
  '/:brandId/threads/:threadId/participants',
  messageController.getThreadParticipants
);

// ============================================
// MESSAGES
// ============================================

// Send message (with optional attachments)
router.post(
  '/:brandId/threads/:threadId/messages',
  upload.array('attachments', 5), // Allow up to 5 attachments
  messageController.sendMessage
);

// Get messages for a thread
router.get(
  '/:brandId/threads/:threadId/messages',
  messageController.getThreadMessages
);

// Mark message as read
router.patch(
  '/:brandId/messages/:messageId/read',
  messageController.markMessageAsRead
);

// Mark all thread messages as read
router.patch(
  '/:brandId/threads/:threadId/read',
  messageController.markThreadAsRead
);

// Delete message
router.delete(
  '/:brandId/messages/:messageId',
  messageController.deleteMessage
);

// ============================================
// SEARCH & UTILITIES
// ============================================

// Search messages
router.get(
  '/:brandId/search',
  messageController.searchMessages
);

// Get unread count
router.get(
  '/:brandId/unread',
  messageController.getUnreadCount
);

export default router;
