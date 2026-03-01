import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/clientReportController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId/reports',              ctrl.listReports);
router.post('/:brandId/reports/generate',    ctrl.generateReport);
router.get('/:brandId/reports/:reportId',    ctrl.getReport);
router.delete('/:brandId/reports/:reportId', ctrl.deleteReport);

export default router;
