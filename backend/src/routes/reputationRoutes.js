import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/reputationController.js';

const router = express.Router();

// Public click-tracking redirect (no auth)
router.get('/track/:token', ctrl.trackClick);

router.use(protect);
router.get('/:brandId/settings',              ctrl.getSettings);
router.patch('/:brandId/settings',            ctrl.saveSettings);
router.get('/:brandId/stats',                 ctrl.getStats);
router.get('/:brandId/requests',              ctrl.listRequests);
router.post('/:brandId/requests',             ctrl.sendRequest);
router.patch('/:brandId/requests/:requestId', ctrl.markCompleted);
router.get('/:brandId/reviews',               ctrl.listReviews);
router.post('/:brandId/reviews',              ctrl.addReview);
router.patch('/:brandId/reviews/:reviewId',   ctrl.updateReview);
router.delete('/:brandId/reviews/:reviewId',  ctrl.deleteReview);

export default router;
