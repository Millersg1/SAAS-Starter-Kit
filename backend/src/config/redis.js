import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redis = null;
let redisAvailable = false;

export function getRedis() {
  // Only attempt Redis if explicitly configured
  if (!process.env.REDIS_URL) return null;
  if (redis) return redisAvailable ? redis : null;

  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // Never throw on individual commands — just queue
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis: giving up after 3 retries');
          redisAvailable = false;
          return null; // stop reconnecting
        }
        return Math.min(times * 500, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false, // Don't queue commands when disconnected
    });

    redis.on('connect', () => {
      redisAvailable = true;
      logger.info('Redis connected');
    });
    redis.on('error', (err) => {
      redisAvailable = false;
      logger.warn({ err: err.message }, 'Redis error');
    });
    redis.on('close', () => { redisAvailable = false; });

    redis.connect().catch(() => {
      logger.warn('Redis unavailable — using in-memory fallback');
      redisAvailable = false;
    });
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis init failed');
    redis = null;
    return null;
  }

  return redisAvailable ? redis : null;
}

export async function cacheGet(key) {
  if (!redisAvailable || !redis) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  if (!redisAvailable || !redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch { /* ignore */ }
}

export async function cacheDel(key) {
  if (!redisAvailable || !redis) return;
  try { await redis.del(key); } catch { /* ignore */ }
}

export async function closeRedis() {
  if (redis) {
    await redis.quit().catch(() => {});
    redis = null;
    redisAvailable = false;
  }
}
