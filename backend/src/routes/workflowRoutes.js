import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as workflowController from '../controllers/workflowController.js';

const router = express.Router();
router.use(protect);
router.get('/:brandId', workflowController.listWorkflows);
router.post('/:brandId', workflowController.createWorkflow);
router.get('/:brandId/:workflowId/enrollments', workflowController.getEnrollments);
router.post('/:brandId/:workflowId/enroll', workflowController.manualEnroll);
router.get('/:brandId/:workflowId', workflowController.getWorkflow);
router.patch('/:brandId/:workflowId', workflowController.updateWorkflow);
router.delete('/:brandId/:workflowId', workflowController.deleteWorkflow);
export default router;
