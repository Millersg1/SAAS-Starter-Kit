import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as socialController from '../controllers/socialController.js';

const router = express.Router();

// ── Public review routes (no auth) ───────────────────────────────────────────
router.get('/review/:token',  socialController.publicGetPostForReview);
router.post('/review/:token', socialController.publicSubmitPostReview);

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(protect);

// Accounts
router.get('/:brandId/accounts',                   socialController.listAccounts);
router.post('/:brandId/accounts',                  socialController.connectAccount);
router.patch('/:brandId/accounts/:accountId',      socialController.updateAccount);
router.delete('/:brandId/accounts/:accountId',     socialController.disconnectAccount);

// OAuth
router.get('/:brandId/oauth/:platform',            socialController.oauthRedirect);
router.get('/:brandId/oauth/:platform/callback',   socialController.oauthCallback);

// Posts
router.get('/:brandId/posts',                      socialController.listPosts);
router.post('/:brandId/posts',                     socialController.createPost);
router.get('/:brandId/posts/:postId',              socialController.getPost);
router.patch('/:brandId/posts/:postId',            socialController.updatePost);
router.delete('/:brandId/posts/:postId',           socialController.deletePost);
router.post('/:brandId/posts/:postId/publish',     socialController.publishNow);
router.post('/:brandId/posts/:postId/send-for-review', socialController.sendPostForReview);

// Calendar
router.get('/:brandId/calendar',                   socialController.getCalendar);

// Analytics
router.get('/:brandId/analytics',                  socialController.getAnalytics);

// AI caption
router.post('/:brandId/ai-caption',                socialController.generateCaption);

export default router;
