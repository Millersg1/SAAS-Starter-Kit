import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  listSegments, createSegment, updateSegment, deleteSegment,
  getSegmentClients, previewSegment,
} from '../controllers/segmentController.js';

const router = Router();
router.use(protect);

router.get('/:brandId',                     listSegments);
router.post('/:brandId',                    createSegment);
router.post('/:brandId/preview',            previewSegment);
router.patch('/:brandId/:segmentId',        updateSegment);
router.delete('/:brandId/:segmentId',       deleteSegment);
router.get('/:brandId/:segmentId/clients',  getSegmentClients);

export default router;
