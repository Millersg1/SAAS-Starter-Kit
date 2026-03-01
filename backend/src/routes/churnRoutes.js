import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as churnController from '../controllers/churnController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId/churn',                churnController.getChurnPredictions);
router.get('/:brandId/churn/:clientId',       churnController.getClientChurnPrediction);
router.post('/:brandId/churn/recalculate',    churnController.recalculateChurn);

export default router;
