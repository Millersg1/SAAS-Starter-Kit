import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as pipelineController from '../controllers/pipelineController.js';

const router = express.Router();
router.use(protect);

// Pipeline management
router.get('/:brandId/pipelines',                      pipelineController.getPipelines);
router.post('/:brandId/pipelines',                     pipelineController.createPipeline);
router.patch('/:brandId/pipelines/:pipelineId',        pipelineController.updatePipeline);
router.delete('/:brandId/pipelines/:pipelineId',       pipelineController.deletePipeline);

// Summary & deals
router.get('/:brandId/summary',                        pipelineController.getSummary);
router.get('/:brandId',                                pipelineController.getDeals);
router.post('/:brandId',                               pipelineController.createDeal);
router.get('/:brandId/deals/:dealId',                  pipelineController.getDeal);
router.patch('/:brandId/deals/:dealId',                pipelineController.updateDeal);
router.delete('/:brandId/deals/:dealId',               pipelineController.deleteDeal);

export default router;
