import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validate, createClientSchema, updateClientSchema } from '../utils/validators.js';
import * as clientController from '../controllers/clientController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get clients assigned to current user
router.get('/assigned', clientController.getAssignedClients);

// Brand-specific client routes
// Get client statistics for a brand
router.get('/:brandId/stats', clientController.getClientStats);

// Portal activity
router.get('/:brandId/portal-activity', clientController.getPortalActivity);

// CSV bulk import (no validation schema — accepts arbitrary fields)
router.post('/:brandId/import', clientController.importClients);

// CRUD operations for clients within a brand
router.post(
  '/:brandId',
  validate(createClientSchema),
  clientController.createClient
);

router.get('/:brandId', clientController.getBrandClients);

router.get('/:brandId/:clientId', clientController.getClient);

router.patch(
  '/:brandId/:clientId',
  validate(updateClientSchema),
  clientController.updateClient
);

router.delete('/:brandId/:clientId', clientController.deleteClient);

// Portal access management
router.post('/:brandId/:clientId/portal/enable', clientController.enablePortalAccess);
router.post('/:brandId/:clientId/portal/disable', clientController.disablePortalAccess);

export default router;
