import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET ? JWT_SECRET + '_refresh' : undefined);
const JWT_EXPIRE = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRE = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

/**
 * Generate access token
 * @param {string} userId - User ID
 * @returns {string} JWT access token
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId, type: 'access' }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

/**
 * Generate refresh token
 * @param {string} userId - User ID
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE
  });
};

/**
 * Generate both access and refresh tokens
 * @param {string} userId - User ID
 * @returns {Object} Object containing accessToken and refreshToken
 */
export const generateTokens = (userId) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  return {
    accessToken,
    refreshToken
  };
};

/**
 * Verify access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {AppError} If token is invalid or expired
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type === 'refresh') {
      throw new AppError('Refresh tokens cannot be used as access tokens.', 401);
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Your token has expired! Please log in again.', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token. Please log in again!', 401);
    }
    throw new AppError('Token verification failed.', 401);
  }
};

/**
 * Verify refresh token specifically
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {AppError} If token is invalid or expired
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token has expired. Please log in again.', 401);
    }
    throw new AppError('Invalid refresh token.', 401);
  }
};

/**
 * Decode token without verification (for expired token checks)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};
