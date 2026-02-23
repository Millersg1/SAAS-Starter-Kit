import { verifyToken } from '../utils/jwtUtils.js';
import { findUserById } from '../models/userModel.js';
import { AppError, catchAsync } from './errorHandler.js';

/**
 * Protect routes - require authentication
 */
export const protect = catchAsync(async (req, res, next) => {
  // 1) Get token from header
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2) Verify token
  const decoded = verifyToken(token);

  // 3) Check if user still exists
  const user = await findUserById(decoded.id);
  
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4) Grant access to protected route
  req.user = user;
  next();
});

/**
 * Restrict routes to specific roles
 * @param  {...string} roles - Allowed roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array like ['admin', 'agency']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

/**
 * Check if email is verified
 */
export const requireEmailVerification = (req, res, next) => {
  if (!req.user.email_verified) {
    return next(
      new AppError('Please verify your email address to access this resource.', 403)
    );
  }
  
  next();
};

/**
 * Optional authentication - attach user if token is valid, but don't require it
 */
export const optionalAuth = catchAsync(async (req, res, next) => {
  // 1) Get token from header
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token, continue without user
  if (!token) {
    return next();
  }

  try {
    // 2) Verify token
    const decoded = verifyToken(token);

    // 3) Check if user still exists
    const user = await findUserById(decoded.id);
    
    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Invalid token, but we don't throw error for optional auth
    console.log('Invalid token in optional auth: - authMiddleware.js:93', error.message);
  }

  next();
});
