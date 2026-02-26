import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as callLogController from '../controllers/callLogController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId', callLogController.listCallLogs);
router.post('/:brandId', callLogController.createCallLog);
router.patch('/:brandId/:logId', callLogController.updateCallLog);
router.delete('/:brandId/:logId', callLogController.deleteCallLog);

export default router;
