import { catchAsync, AppError } from '../middleware/errorHandler.js';
import * as userModel from '../models/userModel.js';
import { generateTokens, verifyToken } from '../utils/jwtUtils.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../utils/emailUtils.js';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await userModel.findUserByEmail(email);
  
  if (existingUser) {
    return next(new AppError('Email already registered. Please use a different email or login.', 400));
  }

  // Create user
  const { user, emailVerificationToken } = await userModel.createUser({
    name,
    email,
    password,
    role: role || 'client'
  });

  // Send verification email
  try {
    await sendVerificationEmail(email, name, emailVerificationToken);
  } catch (error) {
    console.error('Failed to send verification email: - authController.js:32', error);
    // Don't fail registration if email fails
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token in database
  await userModel.updateRefreshToken(user.id, refreshToken);

  res.status(201).json({
    status: 'success',
    message: 'Registration successful! Please check your email to verify your account.',
    data: {
      user,
      accessToken,
      refreshToken
    }
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await userModel.findUserByEmail(email);

  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check password
  const isPasswordCorrect = await userModel.comparePassword(password, user.password);

  if (!isPasswordCorrect) {
    return next(new AppError('Invalid email or password', 401));
  }

  // If 2FA is enabled, return a short-lived temp token instead of full session
  if (user.totp_enabled) {
    const tempToken = jwt.sign(
      { userId: user.id, type: '2fa_pending' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    return res.status(200).json({
      status: 'success',
      requires_2fa: true,
      temp_token: tempToken,
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token in database
  await userModel.updateRefreshToken(user.id, refreshToken);

  // Remove password from response
  const { password: _, refresh_token: __, ...userWithoutSensitiveData } = user;

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: userWithoutSensitiveData,
      accessToken,
      refreshToken
    }
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = catchAsync(async (req, res, next) => {
  // Clear refresh token from database
  await userModel.clearRefreshToken(req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'Logout successful'
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Refresh token is required', 400));
  }

  // Verify refresh token
  const decoded = verifyToken(refreshToken);

  // Find user by refresh token
  const user = await userModel.findUserByRefreshToken(refreshToken);

  if (!user) {
    return next(new AppError('Invalid refresh token', 401));
  }

  // Generate new tokens
  const tokens = generateTokens(user.id);

  // Update refresh token in database
  await userModel.updateRefreshToken(user.id, tokens.refreshToken);

  res.status(200).json({
    status: 'success',
    message: 'Token refreshed successfully',
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }
  });
});

/**
 * Verify email
 * GET /api/auth/verify-email/:token
 */
export const verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  // Verify email with token
  const user = await userModel.verifyEmail(token);

  if (!user) {
    return next(new AppError('Invalid or expired verification token', 400));
  }

  // Send welcome email
  try {
    await sendWelcomeEmail(user.email, user.name);
  } catch (error) {
    console.error('Failed to send welcome email: - authController.js:163', error);
    // Don't fail verification if welcome email fails
  }

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully! You can now access all features.',
    data: {
      user
    }
  });
});

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // Create password reset token
  const result = await userModel.createPasswordResetToken(email);

  if (!result) {
    // Don't reveal if email exists or not for security
    return res.status(200).json({
      status: 'success',
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }

  const { user, resetToken } = result;

  // Send password reset email
  try {
    await sendPasswordResetEmail(user.email, user.name, resetToken);
  } catch (error) {
    console.error('Failed to send password reset email: - authController.js:200', error);
    return next(new AppError('Failed to send password reset email. Please try again later.', 500));
  }

  res.status(200).json({
    status: 'success',
    message: 'Password reset link has been sent to your email.'
  });
});

/**
 * Reset password
 * POST /api/auth/reset-password/:token
 */
export const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  // Reset password with token
  const user = await userModel.resetPassword(token, password);

  if (!user) {
    return next(new AppError('Invalid or expired reset token', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful! You can now login with your new password.',
    data: {
      user
    }
  });
});

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = catchAsync(async (req, res, next) => {
  // User is already attached to req by protect middleware
  const user = await userModel.findUserById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

/**
 * Update current user password
 * PATCH /api/auth/update-password
 */
export const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await userModel.findUserByEmail(req.user.email);

  // Check current password
  const isPasswordCorrect = await userModel.comparePassword(currentPassword, user.password);

  if (!isPasswordCorrect) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Update password
  await userModel.updatePassword(user.id, newPassword);

  // Generate new tokens
  const tokens = generateTokens(user.id);

  // Update refresh token in database
  await userModel.updateRefreshToken(user.id, tokens.refreshToken);

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully',
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }
  });
});

// ─── Two-Factor Authentication ────────────────────────────────────────────────

/**
 * Generate a new TOTP secret and return QR code image
 * POST /api/auth/2fa/setup   (protected)
 */
export const setup2FA = catchAsync(async (req, res, next) => {
  const secret = speakeasy.generateSecret({
    name: `SAAS Surface:${req.user.email}`,
    length: 20,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  res.status(200).json({
    status: 'success',
    data: {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
      qr_code: qrCodeDataUrl,
    },
  });
});

/**
 * Verify TOTP token and save secret — enables 2FA
 * POST /api/auth/2fa/enable   (protected)
 */
export const enable2FA = catchAsync(async (req, res, next) => {
  const { secret, token } = req.body;
  if (!secret || !token) return next(new AppError('secret and token are required.', 400));

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(token),
    window: 1,
  });

  if (!verified) return next(new AppError('Invalid verification code. Please try again.', 400));

  // Generate 8 single-use backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    `${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`
  );

  await userModel.saveTotpSecret(req.user.id, secret, backupCodes);

  res.status(200).json({
    status: 'success',
    message: 'Two-factor authentication enabled.',
    data: { backup_codes: backupCodes },
  });
});

/**
 * Disable 2FA after password verification
 * POST /api/auth/2fa/disable   (protected)
 */
export const disable2FA = catchAsync(async (req, res, next) => {
  const { password } = req.body;
  if (!password) return next(new AppError('Password is required.', 400));

  const user = await userModel.findUserByEmail(req.user.email);
  const ok = await userModel.comparePassword(password, user.password);
  if (!ok) return next(new AppError('Incorrect password.', 401));

  await userModel.disableTotp(req.user.id);

  res.status(200).json({ status: 'success', message: 'Two-factor authentication disabled.' });
});

/**
 * Exchange temp_token + TOTP code for real session tokens
 * POST /api/auth/2fa/verify   (no protect middleware — uses temp_token itself)
 */
export const verify2FA = catchAsync(async (req, res, next) => {
  const { temp_token, code } = req.body;
  if (!temp_token || !code) return next(new AppError('temp_token and code are required.', 400));

  let decoded;
  try {
    decoded = jwt.verify(temp_token, JWT_SECRET);
  } catch {
    return next(new AppError('Invalid or expired session. Please log in again.', 401));
  }

  if (decoded.type !== '2fa_pending') {
    return next(new AppError('Invalid token type.', 401));
  }

  const totpData = await userModel.getTotpData(decoded.userId);
  if (!totpData || !totpData.totp_enabled) {
    return next(new AppError('2FA is not enabled for this account.', 400));
  }

  // Check TOTP code
  const totpValid = speakeasy.totp.verify({
    secret: totpData.totp_secret,
    encoding: 'base32',
    token: String(code),
    window: 1,
  });

  if (!totpValid) {
    // Check backup codes
    const backupCodes = totpData.totp_backup_codes || [];
    const backupMatch = backupCodes.includes(String(code));
    if (!backupMatch) {
      return next(new AppError('Invalid verification code.', 401));
    }
    await userModel.consumeBackupCode(decoded.userId, String(code), backupCodes);
  }

  const user = await userModel.findUserById(decoded.userId);
  const { accessToken, refreshToken } = generateTokens(decoded.userId);
  await userModel.updateRefreshToken(decoded.userId, refreshToken);

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: { user, accessToken, refreshToken },
  });
});
