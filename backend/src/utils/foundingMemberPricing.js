/**
 * Founding Member Pricing System
 *
 * First 50 paying subscribers get lifetime price lock.
 * After 50, prices automatically roll up to standard rates.
 *
 * The system works by checking the subscription count when a new
 * subscription is created. If count <= 50, the user gets founding
 * member status and their price never changes.
 */
import { query } from '../config/database.js';
import logger from './logger.js';

// Founding member pricing (current)
export const FOUNDING_PRICES = {
  starter: { monthly: 29, annual: 23 },
  professional: { monthly: 79, annual: 63 },
  agency: { monthly: 199, annual: 159 },
  enterprise: { monthly: 499, annual: 399 },
};

// Standard pricing (after 50 founding members)
export const STANDARD_PRICES = {
  starter: { monthly: 49, annual: 39 },
  professional: { monthly: 149, annual: 119 },
  agency: { monthly: 349, annual: 279 },
  enterprise: { monthly: 799, annual: 639 },
};

const FOUNDING_MEMBER_LIMIT = 50;

// Create founding member tracking table
query(`
  CREATE TABLE IF NOT EXISTS founding_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL UNIQUE REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(50) NOT NULL,
    locked_price_monthly DECIMAL(10,2) NOT NULL,
    locked_price_annual DECIMAL(10,2) NOT NULL,
    member_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_founding_members_brand ON founding_members(brand_id);
`).catch(() => {});

/**
 * Get the current count of founding members.
 */
export async function getFoundingMemberCount() {
  try {
    const result = await query(`SELECT COUNT(*)::int as count FROM founding_members`);
    return result.rows[0]?.count || 0;
  } catch {
    return 0;
  }
}

/**
 * Check if a brand is a founding member.
 */
export async function isFoundingMember(brandId) {
  try {
    const result = await query(`SELECT id, member_number, locked_price_monthly FROM founding_members WHERE brand_id = $1`, [brandId]);
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

/**
 * Check if founding member slots are still available.
 */
export async function hasFoundingSlots() {
  const count = await getFoundingMemberCount();
  return count < FOUNDING_MEMBER_LIMIT;
}

/**
 * Register a new founding member (called when a subscription is created).
 * Returns the founding member record if eligible, null if slots are full.
 */
export async function registerFoundingMember(brandId, userId, planName) {
  try {
    const count = await getFoundingMemberCount();
    if (count >= FOUNDING_MEMBER_LIMIT) {
      logger.info({ brandId, count }, '[Founding] No slots available — standard pricing applies');
      return null;
    }

    const prices = FOUNDING_PRICES[planName];
    if (!prices) return null;

    const memberNumber = count + 1;

    const result = await query(
      `INSERT INTO founding_members (brand_id, user_id, plan_name, locked_price_monthly, locked_price_annual, member_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (brand_id) DO NOTHING
       RETURNING *`,
      [brandId, userId, planName, prices.monthly, prices.annual, memberNumber]
    );

    if (result.rows[0]) {
      logger.info({ brandId, memberNumber, planName }, `[Founding] Member #${memberNumber} registered!`);
      return result.rows[0];
    }

    return null;
  } catch (err) {
    logger.error({ err: err.message }, '[Founding] Error registering member');
    return null;
  }
}

/**
 * Get the correct pricing for a plan based on founding member status.
 */
export async function getPricingForBrand(brandId, planName) {
  const founding = await isFoundingMember(brandId);
  if (founding) {
    return {
      monthly: parseFloat(founding.locked_price_monthly),
      annual: parseFloat(founding.locked_price_annual),
      isFoundingMember: true,
      memberNumber: founding.member_number,
    };
  }

  const hasSlots = await hasFoundingSlots();
  const prices = hasSlots ? FOUNDING_PRICES[planName] : STANDARD_PRICES[planName];

  return {
    monthly: prices?.monthly || 0,
    annual: prices?.annual || 0,
    isFoundingMember: false,
    foundingSlotsRemaining: hasSlots ? FOUNDING_MEMBER_LIMIT - (await getFoundingMemberCount()) : 0,
  };
}

/**
 * Get current pricing tier (founding or standard) for the public pricing page.
 */
export async function getCurrentPricingTier() {
  const count = await getFoundingMemberCount();
  const isFoundingPhase = count < FOUNDING_MEMBER_LIMIT;

  return {
    phase: isFoundingPhase ? 'founding' : 'standard',
    prices: isFoundingPhase ? FOUNDING_PRICES : STANDARD_PRICES,
    foundingMembersCount: count,
    foundingSlotsRemaining: Math.max(0, FOUNDING_MEMBER_LIMIT - count),
    foundingMemberLimit: FOUNDING_MEMBER_LIMIT,
  };
}
