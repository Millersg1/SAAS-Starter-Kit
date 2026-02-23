import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as taskController from '../controllers/taskController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId',                    taskController.getBrandTasks);
router.post('/:brandId',                   taskController.createTask);
router.get('/:brandId/:taskId',            taskController.getTask);
router.patch('/:brandId/:taskId',          taskController.updateTask);
router.post('/:brandId/:taskId/complete',  taskController.completeTask);
router.delete('/:brandId/:taskId',         taskController.deleteTask);

export default router;
