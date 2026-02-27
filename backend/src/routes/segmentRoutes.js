import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as segmentController from '../controllers/segmentController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId',                      segmentController.listSegments);
router.post('/:brandId',                     segmentController.createSegment);
router.patch('/:brandId/:segmentId',         segmentController.updateSegment);
router.delete('/:brandId/:segmentId',        segmentController.deleteSegment);
router.post('/:brandId/preview',             segmentController.previewSegment);
router.get('/:brandId/:segmentId/clients',   segmentController.getSegmentClients);

export default router;
