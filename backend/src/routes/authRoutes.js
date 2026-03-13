import express from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema
} from '../utils/validators.js';

const router = express.Router();

// Strict rate limiting for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { status: 'fail', message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public routes (no authentication required)
 */

// Register new user
router.post('/register', authLimiter, validate(registerSchema), authController.register);

// Login user
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Refresh access token
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// Request password reset
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

// Reset password with token
router.post('/reset-password/:token', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Verify email with token
router.get('/verify-email/:token', authController.verifyEmail);

/**
 * Protected routes (authentication required)
 */

// Get current user
router.get('/me', protect, authController.getCurrentUser);

// Logout user
router.post('/logout', protect, authController.logout);

// Update password
router.patch('/update-password', protect, authController.updatePassword);

// Two-factor authentication
router.post('/2fa/setup',   protect, authController.setup2FA);
router.post('/2fa/enable',  protect, authController.enable2FA);
router.post('/2fa/disable', protect, authController.disable2FA);
router.post('/2fa/verify',  authController.verify2FA);

export default router;
