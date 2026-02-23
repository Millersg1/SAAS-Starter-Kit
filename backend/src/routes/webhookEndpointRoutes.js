import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as webhookEndpointController from '../controllers/webhookEndpointController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId', webhookEndpointController.listEndpoints);
router.post('/:brandId', webhookEndpointController.createEndpoint);
router.patch('/:brandId/:endpointId', webhookEndpointController.updateEndpoint);
router.delete('/:brandId/:endpointId', webhookEndpointController.deleteEndpoint);
router.get('/:brandId/:endpointId/deliveries', webhookEndpointController.getDeliveries);

export default router;
