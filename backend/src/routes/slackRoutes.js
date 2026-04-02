import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/slackController.js';

const router = express.Router();

router.use(protect);

router.get('/:brandId',       ctrl.getConfig);
router.post('/:brandId',      ctrl.createConfig);
router.patch('/:brandId',     ctrl.updateConfig);
router.delete('/:brandId',    ctrl.deleteConfig);
router.post('/:brandId/test', ctrl.testNotification);

export default router;
