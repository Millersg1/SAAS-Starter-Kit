import express from 'express';
import * as searchController from '../controllers/searchController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * GET /api/search/:brandId - Global search
 * Query params: q (required), type (optional), limit, offset
 */
router.get('/:brandId', searchController.globalSearch);

/**
 * GET /api/search/:brandId/suggestions - Get search suggestions
 * Query params: q (required), limit
 */
router.get('/:brandId/suggestions', searchController.getSearchSuggestions);

export default router;
