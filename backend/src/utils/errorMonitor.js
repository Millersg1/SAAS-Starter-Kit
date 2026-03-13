/**
 * Lightweight error monitoring utility.
 * Provides structured logging, in-memory error aggregation, and optional Sentry.
 *
 * Usage:
 *   import { logError, getErrorSummary } from '../utils/errorMonitor.js';
 *   logError(error, { context: 'subscriptionController.createSubscription', brandId });
 */
import dotenv from 'dotenv';
dotenv.config();

let Sentry = null;

// Initialize Sentry if DSN is configured
if (process.env.SENTRY_DSN) {
  try {
    const mod = await import('@sentry/node');
    Sentry = mod;
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    });
    console.log('Sentry error monitoring initialized');
  } catch {
    console.warn('SENTRY_DSN set but @sentry/node not installed — using console logging only');
  }
}

// In-memory error counter (resets on restart, intentionally lightweight)
const errorCounts = {};
const MAX_TRACKED_TYPES = 200;

/**
 * Log an error with structured context.
 * @param {Error|string} error - The error object or message
 * @param {Object} context - Additional context (controller, brandId, userId, etc.)
 */
export function logError(error, context = {}) {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const key = context.context || 'unknown';

  // Aggregate count
  if (Object.keys(errorCounts).length < MAX_TRACKED_TYPES) {
    errorCounts[key] = (errorCounts[key] || 0) + 1;
  }

  // Structured console output
  const entry = { timestamp, level: 'error', message, ...context };
  if (stack) entry.stack = stack;
  console.error(JSON.stringify(entry));

  // Forward to Sentry if available
  if (Sentry) {
    Sentry.withScope((scope) => {
      for (const [k, v] of Object.entries(context)) {
        scope.setExtra(k, v);
      }
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(message, 'error');
      }
    });
  }
}

/**
 * Get a summary of error counts by context (for a diagnostics endpoint).
 */
export function getErrorSummary() {
  return { ...errorCounts };
}

/**
 * Express error-handling middleware that logs to the monitor.
 * Add AFTER all routes: app.use(errorMonitorMiddleware);
 */
export function errorMonitorMiddleware(err, req, res, next) {
  logError(err, {
    context: `${req.method} ${req.originalUrl}`,
    userId: req.user?.id,
    ip: req.ip,
  });
  next(err);
}
