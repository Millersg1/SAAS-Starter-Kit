import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as emailConnectionController from '../controllers/emailConnectionController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId', emailConnectionController.listConnections);
router.post('/:brandId', emailConnectionController.createConnection);
router.delete('/:brandId/:connectionId', emailConnectionController.deleteConnection);
router.post('/:brandId/:connectionId/test', emailConnectionController.testConnection);
router.post('/:brandId/:connectionId/sync', emailConnectionController.syncNow);

export default router;
