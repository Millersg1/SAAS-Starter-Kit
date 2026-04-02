import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/retainerController.js';

const router = express.Router();

router.use(protect);

// Dashboard must be defined before /:retainerId to avoid route conflicts
router.get('/:brandId/dashboard',              ctrl.getDashboard);

router.get('/:brandId',                        ctrl.listRetainers);
router.post('/:brandId',                       ctrl.createRetainer);
router.get('/:brandId/:retainerId',            ctrl.getRetainer);
router.patch('/:brandId/:retainerId',          ctrl.updateRetainer);
router.delete('/:brandId/:retainerId',         ctrl.deleteRetainer);

router.post('/:brandId/:retainerId/usage',     ctrl.logUsage);
router.get('/:brandId/:retainerId/usage',      ctrl.getUsageHistory);

export default router;
