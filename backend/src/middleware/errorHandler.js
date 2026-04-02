// Custom error class
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types (PostgreSQL codes)
    if (err.code === '23505') error = handleDuplicateFieldsDB(err);
    if (err.code === '23503') error = handleForeignKeyViolationDB(err);
    if (err.code === '23502') error = handleNotNullViolationDB(err);
    if (err.code === '22P02') error = handleInvalidInputDB(err);
    if (err.code === '42703') error = new AppError('A required field is missing or invalid.', 400);
    if (err.code === '42P01') error = new AppError('A system resource is temporarily unavailable.', 500);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (err.name === 'ValidationError') error = handleValidationError(err);

    sendErrorProd(error, res);
  }
};

// Send detailed error in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Send limited error info in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } 
  // Programming or other unknown error: don't leak error details
  else {
    console.error('ERROR 💥 - errorHandler.js:57', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Handle PostgreSQL duplicate key error
const handleDuplicateFieldsDB = (err) => {
  const field = err.detail.match(/\(([^)]+)\)/)[1];
  const message = `Duplicate field value: ${field}. Please use another value!`;
  return new AppError(message, 400);
};

// Handle PostgreSQL foreign key violation
const handleForeignKeyViolationDB = (err) => {
  const message = 'Invalid reference. The referenced record does not exist.';
  return new AppError(message, 400);
};

// Handle PostgreSQL NOT NULL violation
const handleNotNullViolationDB = (err) => {
  const col = err.column || 'unknown';
  return new AppError(`Required field "${col}" is missing.`, 400);
};

// Handle PostgreSQL invalid input
const handleInvalidInputDB = (err) => {
  const message = 'Invalid input data format.';
  return new AppError(message, 400);
};

// Handle JWT errors
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again!', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired! Please log in again.', 401);
};

// Handle validation errors
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Async error wrapper
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
export const notFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};
