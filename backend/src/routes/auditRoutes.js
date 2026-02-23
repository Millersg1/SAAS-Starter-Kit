import express from 'express';
import * as auditController from '../controllers/auditController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * GET /api/audit/:brandId - Get audit logs for a brand
 * Query params: action, entity_type, user_id, start_date, end_date, limit, offset
 */
router.get('/:brandId', auditController.getBrandAuditLogs);

/**
 * GET /api/audit/:brandId/stats - Get audit statistics
 * Query params: start_date, end_date
 */
router.get('/:brandId/stats', auditController.getAuditStats);

/**
 * GET /api/audit/:brandId/search - Search audit logs
 * Query params: q, limit, offset
 */
router.get('/:brandId/search', auditController.searchAuditLogs);

/**
 * POST /api/audit/log - Create an audit log entry (for manual logging)
 * Body: action, entityType, entityId, description, oldValues, newValues
 */
router.post('/log', auditController.logAction);

export default router;
