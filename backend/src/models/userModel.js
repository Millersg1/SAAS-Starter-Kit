import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Object} Created user (without password)
 */
export const createUser = async ({ name, email, password, role = 'client' }) => {
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // Generate email verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const result = await query(
    `INSERT INTO users (name, email, password, role, email_verification_token, email_verification_expires)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, role, email_verified, created_at`,
    [name, email, hashedPassword, role, emailVerificationToken, emailVerificationExpires]
  );

  return {
    user: result.rows[0],
    emailVerificationToken
  };
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Object|null} User object or null
 */
export const findUserByEmail = async (email) => {
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  
  return result.rows[0] || null;
};

/**
 * Find user by ID
 * @param {string} userId - User ID
 * @returns {Object|null} User object or null
 */
export const findUserById = async (userId) => {
  const result = await query(
    `SELECT id, name, email, role, email_verified, phone, avatar_url, bio,
            preferences, is_active, is_superadmin, last_login, created_at, updated_at
     FROM users
     WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [userId]
  );
  
  return result.rows[0] || null;
};

/**
 * Compare password with hashed password
 * @param {string} candidatePassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {boolean} True if passwords match
 */
export const comparePassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

/**
 * Update user's refresh token (stored as SHA256 hash)
 * @param {string} userId - User ID
 * @param {string} refreshToken - Refresh token (plain)
 */
export const updateRefreshToken = async (userId, refreshToken) => {
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query(
    'UPDATE users SET refresh_token = $1, last_login = CURRENT_TIMESTAMP WHERE id = $2',
    [hashedToken, userId]
  );
};

/**
 * Clear user's refresh token (logout)
 * @param {string} userId - User ID
 */
export const clearRefreshToken = async (userId) => {
  await query(
    'UPDATE users SET refresh_token = NULL WHERE id = $1',
    [userId]
  );
};

/**
 * Find user by refresh token (compares SHA256 hash)
 * @param {string} refreshToken - Refresh token (plain)
 * @returns {Object|null} User object or null
 */
export const findUserByRefreshToken = async (refreshToken) => {
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const result = await query(
    'SELECT id, name, email, role, email_verified FROM users WHERE refresh_token = $1',
    [hashedToken]
  );

  return result.rows[0] || null;
};

/**
 * Verify user's email
 * @param {string} token - Email verification token
 * @returns {Object|null} User object or null
 */
export const verifyEmail = async (token) => {
  const result = await query(
    `UPDATE users 
     SET email_verified = TRUE, 
         email_verification_token = NULL, 
         email_verification_expires = NULL
     WHERE email_verification_token = $1 
       AND email_verification_expires > CURRENT_TIMESTAMP
     RETURNING id, name, email, role, email_verified`,
    [token]
  );
  
  return result.rows[0] || null;
};

/**
 * Create password reset token
 * @param {string} email - User email
 * @returns {Object|null} Object with user and reset token, or null
 */
export const createPasswordResetToken = async (email) => {
  const user = await findUserByEmail(email);
  
  if (!user) {
    return null;
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await query(
    `UPDATE users 
     SET password_reset_token = $1, 
         password_reset_expires = $2
     WHERE id = $3`,
    [resetToken, resetTokenExpires, user.id]
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    resetToken
  };
};

/**
 * Reset password using token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Object|null} User object or null
 */
export const resetPassword = async (token, newPassword) => {
  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const result = await query(
    `UPDATE users 
     SET password = $1, 
         password_reset_token = NULL, 
         password_reset_expires = NULL,
         refresh_token = NULL
     WHERE password_reset_token = $2 
       AND password_reset_expires > CURRENT_TIMESTAMP
     RETURNING id, name, email, role`,
    [hashedPassword, token]
  );
  
  return result.rows[0] || null;
};

/**
 * Update user password
 * @param {string} userId - User ID
 * @param {string} newPassword - New password
 */
export const updatePassword = async (userId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  await query(
    'UPDATE users SET password = $1, refresh_token = NULL WHERE id = $2',
    [hashedPassword, userId]
  );
};

/**
 * Delete user account
 * @param {string} userId - User ID
 */
export const deleteUser = async (userId) => {
  await query(
    'DELETE FROM users WHERE id = $1',
    [userId]
  );
};

/**
 * Get all users (admin only)
 * @param {Object} options - Query options (limit, offset, role filter)
 * @returns {Array} Array of users
 */
export const getAllUsers = async ({ limit = 50, offset = 0, role = null } = {}) => {
  let queryText = `
    SELECT id, name, email, role, email_verified, last_login, created_at 
    FROM users
  `;
  const params = [];
  
  if (role) {
    queryText += ' WHERE role = $1';
    params.push(role);
  }
  
  queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, offset);

  const result = await query(queryText, params);
  
  return result.rows;
};

/**
 * Count total users
 * @param {string} role - Optional role filter
 * @returns {number} Total count
 */
export const countUsers = async (role = null) => {
  let queryText = 'SELECT COUNT(*) as count FROM users';
  const params = [];
  
  if (role) {
    queryText += ' WHERE role = $1';
    params.push(role);
  }

  const result = await query(queryText, params);
  
  return parseInt(result.rows[0].count);
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data to update
 * @returns {Object|null} Updated user object or null
 */
export const updateUserProfile = async (userId, profileData) => {
  const { name, phone, bio, avatar_url } = profileData;
  
  const result = await query(
    `UPDATE users 
     SET name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         bio = COALESCE($3, bio),
         avatar_url = COALESCE($4, avatar_url)
     WHERE id = $5 AND is_active = TRUE AND deleted_at IS NULL
     RETURNING id, name, email, role, phone, avatar_url, bio, preferences, 
               email_verified, last_login, created_at, updated_at`,
    [name, phone, bio, avatar_url, userId]
  );
  
  return result.rows[0] || null;
};

/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - User preferences object
 * @returns {Object|null} Updated user object or null
 */
export const updateUserPreferences = async (userId, preferences) => {
  const result = await query(
    `UPDATE users 
     SET preferences = $1
     WHERE id = $2 AND is_active = TRUE AND deleted_at IS NULL
     RETURNING id, name, email, role, phone, avatar_url, bio, preferences, 
               email_verified, last_login, created_at, updated_at`,
    [JSON.stringify(preferences), userId]
  );
  
  return result.rows[0] || null;
};

/**
 * Soft delete user account
 * @param {string} userId - User ID
 * @returns {boolean} True if deleted successfully
 */
export const softDeleteUser = async (userId) => {
  const result = await query(
    `UPDATE users 
     SET is_active = FALSE,
         deleted_at = CURRENT_TIMESTAMP,
         refresh_token = NULL,
         email_verification_token = NULL,
         password_reset_token = NULL
     WHERE id = $1 AND is_active = TRUE
     RETURNING id`,
    [userId]
  );
  
  return result.rows.length > 0;
};

// ─── 2FA / TOTP ───────────────────────────────────────────────────────────────

export const getTotpData = async (userId) => {
  const result = await query(
    `SELECT id, email, totp_secret, totp_enabled, totp_backup_codes
     FROM users WHERE id = $1 AND is_active = TRUE`,
    [userId]
  );
  return result.rows[0] || null;
};

export const saveTotpSecret = async (userId, secret, backupCodes) => {
  await query(
    `UPDATE users
     SET totp_secret = $1, totp_enabled = TRUE, totp_backup_codes = $2
     WHERE id = $3`,
    [secret, JSON.stringify(backupCodes), userId]
  );
};

export const disableTotp = async (userId) => {
  await query(
    `UPDATE users
     SET totp_secret = NULL, totp_enabled = FALSE, totp_backup_codes = NULL
     WHERE id = $1`,
    [userId]
  );
};

export const consumeBackupCode = async (userId, code, backupCodes) => {
  const remaining = backupCodes.filter((c) => c !== code);
  await query(
    `UPDATE users SET totp_backup_codes = $1 WHERE id = $2`,
    [JSON.stringify(remaining), userId]
  );
};

/**
 * Get user profile with all fields
 * @param {string} userId - User ID
 * @returns {Object|null} Complete user profile or null
 */
export const getUserProfile = async (userId) => {
  const result = await query(
    `SELECT id, name, email, role, phone, avatar_url, bio, preferences,
            email_verified, is_active, is_superadmin, totp_enabled, last_login, created_at, updated_at
     FROM users
     WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [userId]
  );
  
  return result.rows[0] || null;
};
