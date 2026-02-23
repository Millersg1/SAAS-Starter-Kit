import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as pipelineController from '../controllers/pipelineController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId/summary',       pipelineController.getSummary);
router.get('/:brandId',               pipelineController.getDeals);
router.post('/:brandId',              pipelineController.createDeal);
router.get('/:brandId/deals/:dealId', pipelineController.getDeal);
router.patch('/:brandId/deals/:dealId', pipelineController.updateDeal);
router.delete('/:brandId/deals/:dealId', pipelineController.deleteDeal);

export default router;
