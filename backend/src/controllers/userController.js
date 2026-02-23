import * as userModel from '../models/userModel.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Get current user profile
 * @route GET /api/users/me
 * @access Private
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await userModel.getUserProfile(req.user.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @route PATCH /api/users/me
 * @access Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio, avatar_url } = req.body;

    // Update profile
    const updatedUser = await userModel.updateUserProfile(req.user.id, {
      name,
      phone,
      bio,
      avatar_url
    });

    if (!updatedUser) {
      throw new AppError('Failed to update profile. User may not exist or has been deleted.', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user preferences
 * @route PATCH /api/users/me/preferences
 * @access Private
 */
export const updatePreferences = async (req, res, next) => {
  try {
    // Get current user to merge preferences
    const currentUser = await userModel.getUserProfile(req.user.id);

    if (!currentUser) {
      throw new AppError('User not found', 404);
    }

    // Merge existing preferences with new ones
    const currentPreferences = currentUser.preferences || {};
    const newPreferences = {
      ...currentPreferences,
      ...req.body
    };

    // Update preferences
    const updatedUser = await userModel.updateUserPreferences(req.user.id, newPreferences);

    if (!updatedUser) {
      throw new AppError('Failed to update preferences', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'Preferences updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account (soft delete)
 * @route DELETE /api/users/me
 * @access Private
 */
export const deleteAccount = async (req, res, next) => {
  try {
    const deleted = await userModel.softDeleteUser(req.user.id);

    if (!deleted) {
      throw new AppError('Failed to delete account. User may not exist or has already been deleted.', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully. We\'re sorry to see you go!'
    });
  } catch (error) {
    next(error);
  }
};
