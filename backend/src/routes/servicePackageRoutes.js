import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/servicePackageController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId/packages',                     ctrl.listPackages);
router.post('/:brandId/packages',                    ctrl.createPackage);
router.get('/:brandId/packages/:packageId',          ctrl.getPackage);
router.patch('/:brandId/packages/:packageId',        ctrl.updatePackage);
router.delete('/:brandId/packages/:packageId',       ctrl.deletePackage);
router.post('/:brandId/packages/:packageId/usage',   ctrl.logUsage);
router.get('/:brandId/packages/:packageId/usage',    ctrl.getUsageHistory);

export default router;
