import express from 'express';
import * as projectController from '../controllers/projectController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../utils/validators.js';
import {
  createProjectSchema,
  updateProjectSchema,
  createProjectUpdateSchema,
  updateProjectUpdateSchema
} from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User's assigned projects
router.get('/assigned', projectController.getUserProjects);

// Client projects
router.get('/client/:clientId', projectController.getClientProjects);

// Brand project routes
router.post('/:brandId', validate(createProjectSchema), projectController.createProject);
router.get('/:brandId', projectController.getBrandProjects);
router.get('/:brandId/stats', projectController.getProjectStats);
router.get('/:brandId/:projectId', projectController.getProject);
router.patch('/:brandId/:projectId', validate(updateProjectSchema), projectController.updateProject);
router.delete('/:brandId/:projectId', projectController.deleteProject);

// Project updates routes
router.post('/:brandId/:projectId/updates', validate(createProjectUpdateSchema), projectController.createProjectUpdate);
router.get('/:brandId/:projectId/updates', projectController.getProjectUpdates);
router.get('/:brandId/:projectId/updates/:updateId', projectController.getProjectUpdate);
router.patch('/:brandId/:projectId/updates/:updateId', validate(updateProjectUpdateSchema), projectController.updateProjectUpdate);
router.delete('/:brandId/:projectId/updates/:updateId', projectController.deleteProjectUpdate);

export default router;
