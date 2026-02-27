import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { enrichClient } from '../controllers/enrichmentController.js';

const router = Router();

router.use(protect);
router.post('/:brandId/enrich/:clientId', enrichClient);

export default router;
