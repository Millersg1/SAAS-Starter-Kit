import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireSuperAdmin } from '../middleware/superAdminMiddleware.js';
import * as superAdminController from '../controllers/superAdminController.js';

const router = express.Router();
router.use(protect, requireSuperAdmin);

router.get('/stats',                   superAdminController.getStats);
router.get('/users',                   superAdminController.getAllUsers);
router.patch('/users/:id',             superAdminController.updateUser);
router.delete('/users/:id',            superAdminController.deleteUser);
router.get('/brands',                  superAdminController.getAllBrands);
router.delete('/brands/:id',           superAdminController.deleteBrand);
router.get('/subscriptions',           superAdminController.getAllSubscriptions);
router.patch('/subscriptions/:id',     superAdminController.updateSubscription);
router.get('/audit',                   superAdminController.getAuditLogs);
router.post('/fix',                    superAdminController.runFix);

export default router;
