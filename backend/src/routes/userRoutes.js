import express from 'express';
import * as userController from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate, updateProfileSchema, updatePreferencesSchema } from '../utils/validators.js';

const router = express.Router();

/**
 * All routes in this file require authentication
 */
router.use(protect);

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', userController.getCurrentUser);

/**
 * @route   PATCH /api/users/me
 * @desc    Update user profile
 * @access  Private
 */
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);

/**
 * @route   PATCH /api/users/me/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.patch('/me/preferences', validate(updatePreferencesSchema), userController.updatePreferences);

/**
 * @route   DELETE /api/users/me
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete('/me', userController.deleteAccount);

export default router;
