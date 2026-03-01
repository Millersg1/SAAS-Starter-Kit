import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId/revenue',              analyticsController.getRevenueAnalytics);
router.get('/:brandId/conversion',           analyticsController.getConversionAnalytics);
router.get('/:brandId/pipeline',             analyticsController.getPipelineAnalytics);
router.get('/:brandId/forecast',             analyticsController.getForecast);
router.get('/:brandId/health-scores',        analyticsController.getHealthScores);
router.get('/:brandId/health-scores/:clientId', analyticsController.getClientHealthScore);

export default router;
