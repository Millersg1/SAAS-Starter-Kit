import { query } from '../config/database.js';
import { getPlanConfig, planHasFeature, getPlanLimit, ROUTE_FEATURE_MAP, ENTITY_LIMIT_MAP } from '../config/plans.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';

/**
 * Cache user plan info — Redis (shared across cluster) with in-memory fallback.
 */
const planCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getUserPlan(userId) {
  // Try Redis first (shared across PM2 cluster instances)
  const redisKey = `plan:${userId}`;
  const redisCached = await cacheGet(redisKey);
  if (redisCached) return redisCached;

  // Fall back to in-memory
  const cached = planCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.plan;

  const result = await query(
    `SELECT s.plan_name, s.status, s.trial_end
     FROM subscriptions s
     JOIN brand_members bm ON bm.brand_id = s.brand_id
     WHERE bm.user_id = $1 AND s.status IN ('active', 'trialing')
     ORDER BY
       CASE s.plan_name
         WHEN 'enterprise' THEN 5 WHEN 'agency' THEN 4
         WHEN 'professional' THEN 3 WHEN 'starter' THEN 2
         ELSE 1 END DESC
     LIMIT 1`,
    [userId]
  );

  const plan = result.rows[0]?.plan_name || 'free';
  planCache.set(userId, { plan, ts: Date.now() });
  await cacheSet(redisKey, plan, 300); // 5 min TTL
  return plan;
}

export function clearPlanCache(userId) {
  if (userId) {
    planCache.delete(userId);
    cacheDel(`plan:${userId}`);
  } else {
    planCache.clear();
  }
}

/**
 * Middleware: check if the user's plan includes the feature for this route.
 * Attach req.userPlan for downstream use.
 */
export const enforcePlan = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const planName = await getUserPlan(req.user.id);
    req.userPlan = planName;

    // Super admins bypass all plan checks
    if (req.user.is_superadmin) return next();

    // Find matching feature for this route
    const routePath = req.baseUrl || req.path;
    let requiredFeature = null;
    for (const [prefix, feature] of Object.entries(ROUTE_FEATURE_MAP)) {
      if (routePath.startsWith(prefix)) {
        requiredFeature = feature;
        break;
      }
    }

    if (requiredFeature && !planHasFeature(planName, requiredFeature)) {
      const plan = getPlanConfig(planName);
      return res.status(403).json({
        status: 'fail',
        code: 'plan_limit',
        message: `The "${requiredFeature.replace(/_/g, ' ')}" feature requires a higher plan. You are on the ${plan.name} plan.`,
        current_plan: planName,
        upgrade_required: true,
      });
    }

    next();
  } catch (err) {
    // Don't block requests if plan check fails — log and continue
    console.error('[PlanEnforcement] Error:', err.message);
    next();
  }
};

/**
 * Middleware factory: check entity count limits before creation.
 * Usage: router.post('/', enforceLimit('clients'), createClient)
 */
export const enforceLimit = (entityType) => {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.is_superadmin) return next();

      const planName = req.userPlan || await getUserPlan(req.user.id);
      const limitKey = ENTITY_LIMIT_MAP[entityType];
      if (!limitKey) return next();

      const limit = getPlanLimit(planName, limitKey);
      if (limit === -1) return next(); // unlimited

      // Count current entities for this user's brands
      const countResult = await query(
        `SELECT COUNT(*)::int AS count FROM ${entityType}
         WHERE brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = $1)`,
        [req.user.id]
      );
      const current = countResult.rows[0]?.count || 0;

      if (current >= limit) {
        const plan = getPlanConfig(planName);
        return res.status(403).json({
          status: 'fail',
          code: 'entity_limit',
          message: `You've reached the ${entityType} limit (${limit}) for the ${plan.name} plan. Please upgrade to add more.`,
          current_plan: planName,
          current_count: current,
          limit,
          upgrade_required: true,
        });
      }

      next();
    } catch (err) {
      console.error('[EnforceLimit] Error:', err.message);
      next();
    }
  };
};

/**
 * Track monthly usage (email sends, SMS, AI requests).
 * Call this after a usage action succeeds.
 */
export async function trackUsage(userId, usageType, amount = 1) {
  try {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    await query(
      `INSERT INTO usage_tracking (user_id, usage_type, month, count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, usage_type, month)
       DO UPDATE SET count = usage_tracking.count + $4, updated_at = NOW()`,
      [userId, usageType, month, amount]
    );
  } catch (err) {
    console.error('[TrackUsage] Error:', err.message);
  }
}

/**
 * Check if monthly usage limit is exceeded.
 */
export async function checkMonthlyLimit(userId, usageType) {
  try {
    const planName = await getUserPlan(userId);
    const limitMap = {
      email_sends: 'email_sends_per_month',
      sms_sends: 'sms_per_month',
      ai_requests: 'ai_requests_per_month',
    };
    const limit = getPlanLimit(planName, limitMap[usageType] || usageType);
    if (limit === -1) return { allowed: true, remaining: Infinity };

    const month = new Date().toISOString().slice(0, 7);
    const result = await query(
      `SELECT count FROM usage_tracking WHERE user_id = $1 AND usage_type = $2 AND month = $3`,
      [userId, usageType, month]
    );
    const used = result.rows[0]?.count || 0;
    return { allowed: used < limit, remaining: Math.max(0, limit - used), used, limit };
  } catch (err) {
    console.error('[CheckMonthlyLimit] Error:', err.message);
    return { allowed: true, remaining: Infinity };
  }
}
