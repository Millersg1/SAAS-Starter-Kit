import * as Sentry from '@sentry/node';
import logger from './logger.js';

export function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('Sentry DSN not configured — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration({ app }),
    ],
  });

  logger.info('Sentry error tracking initialized');
}

export function sentryErrorHandler() {
  if (!process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.expressErrorHandler();
}

export { Sentry };
