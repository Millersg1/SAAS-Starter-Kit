import { query } from '../config/database.js';

// ============================================
// SUBSCRIPTION PLANS
// ============================================

/**
 * Get all active subscription plans
 */
export const getAllPlans = async () => {
  const result = await query(
    `SELECT * FROM subscription_plans 
     WHERE is_active = TRUE 
     ORDER BY sort_order, price`
  );
  return result.rows;
};

/**
 * Get plan by ID
 */
export const getPlanById = async (planId) => {
  const result = await query(
    'SELECT * FROM subscription_plans WHERE id = $1',
    [planId]
  );
  return result.rows[0];
};

/**
 * Get plan by slug
 */
export const getPlanBySlug = async (slug) => {
  const result = await query(
    'SELECT * FROM subscription_plans WHERE slug = $1 AND is_active = TRUE',
    [slug]
  );
  return result.rows[0];
};

// ============================================
// SUBSCRIPTIONS
// ============================================

/**
 * Create a new subscription
 */
export const createSubscription = async (subscriptionData) => {
  const result = await query(
    `INSERT INTO subscriptions (
      brand_id, plan_id, stripe_subscription_id, stripe_customer_id,
      status, current_period_start, current_period_end,
      trial_start, trial_end, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      subscriptionData.brand_id,
      subscriptionData.plan_id,
      subscriptionData.stripe_subscription_id,
      subscriptionData.stripe_customer_id,
      subscriptionData.status,
      subscriptionData.current_period_start,
      subscriptionData.current_period_end,
      subscriptionData.trial_start,
      subscriptionData.trial_end,
      JSON.stringify(subscriptionData.metadata || {})
    ]
  );
  return result.rows[0];
};

/**
 * Get subscription by brand ID
 */
export const getSubscriptionByBrandId = async (brandId) => {
  const result = await query(
    `SELECT s.*, 
            sp.name as plan_name, sp.slug as plan_slug, sp.price as plan_price,
            sp.billing_interval, sp.features, sp.max_clients, sp.max_projects,
            sp.max_storage_gb, sp.max_team_members
     FROM subscriptions s
     LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
     WHERE s.brand_id = $1`,
    [brandId]
  );
  return result.rows[0];
};

/**
 * Get subscription by Stripe subscription ID
 */
export const getSubscriptionByStripeId = async (stripeSubscriptionId) => {
  const result = await query(
    `SELECT s.*, 
            sp.name as plan_name, sp.slug as plan_slug
     FROM subscriptions s
     LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
     WHERE s.stripe_subscription_id = $1`,
    [stripeSubscriptionId]
  );
  return result.rows[0];
};

/**
 * Update subscription
 */
export const updateSubscription = async (brandId, updateData) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updateData.plan_id !== undefined) {
    fields.push(`plan_id = $${paramCount++}`);
    values.push(updateData.plan_id);
  }
  if (updateData.status !== undefined) {
    fields.push(`status = $${paramCount++}`);
    values.push(updateData.status);
  }
  if (updateData.current_period_start !== undefined) {
    fields.push(`current_period_start = $${paramCount++}`);
    values.push(updateData.current_period_start);
  }
  if (updateData.current_period_end !== undefined) {
    fields.push(`current_period_end = $${paramCount++}`);
    values.push(updateData.current_period_end);
  }
  if (updateData.cancel_at_period_end !== undefined) {
    fields.push(`cancel_at_period_end = $${paramCount++}`);
    values.push(updateData.cancel_at_period_end);
  }
  if (updateData.canceled_at !== undefined) {
    fields.push(`canceled_at = $${paramCount++}`);
    values.push(updateData.canceled_at);
  }
  if (updateData.ended_at !== undefined) {
    fields.push(`ended_at = $${paramCount++}`);
    values.push(updateData.ended_at);
  }
  if (updateData.metadata !== undefined) {
    fields.push(`metadata = $${paramCount++}`);
    values.push(JSON.stringify(updateData.metadata));
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(brandId);

  const result = await query(
    `UPDATE subscriptions 
     SET ${fields.join(', ')}
     WHERE brand_id = $${paramCount}
     RETURNING *`,
    values
  );
  return result.rows[0];
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (brandId, cancelAtPeriodEnd = true, canceledAt = null) => {
  const result = await query(
    `UPDATE subscriptions 
     SET cancel_at_period_end = $1, 
         canceled_at = $2,
         status = CASE WHEN $1 = FALSE THEN 'canceled' ELSE status END
     WHERE brand_id = $3
     RETURNING *`,
    [cancelAtPeriodEnd, canceledAt, brandId]
  );
  return result.rows[0];
};

/**
 * Delete subscription
 */
export const deleteSubscription = async (brandId) => {
  await query('DELETE FROM subscriptions WHERE brand_id = $1', [brandId]);
};

// ============================================
// PAYMENT METHODS
// ============================================

/**
 * Add payment method
 */
export const addPaymentMethod = async (paymentMethodData) => {
  const result = await query(
    `INSERT INTO payment_methods (
      brand_id, stripe_payment_method_id, type, card_brand, card_last4,
      card_exp_month, card_exp_year, bank_name, bank_last4, is_default
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      paymentMethodData.brand_id,
      paymentMethodData.stripe_payment_method_id,
      paymentMethodData.type,
      paymentMethodData.card_brand,
      paymentMethodData.card_last4,
      paymentMethodData.card_exp_month,
      paymentMethodData.card_exp_year,
      paymentMethodData.bank_name,
      paymentMethodData.bank_last4,
      paymentMethodData.is_default || false
    ]
  );
  return result.rows[0];
};

/**
 * Get payment methods by brand ID
 */
export const getPaymentMethodsByBrandId = async (brandId) => {
  const result = await query(
    `SELECT * FROM payment_methods 
     WHERE brand_id = $1 
     ORDER BY is_default DESC, created_at DESC`,
    [brandId]
  );
  return result.rows;
};

/**
 * Get payment method by ID
 */
export const getPaymentMethodById = async (methodId) => {
  const result = await query(
    'SELECT * FROM payment_methods WHERE id = $1',
    [methodId]
  );
  return result.rows[0];
};

/**
 * Set default payment method
 */
export const setDefaultPaymentMethod = async (brandId, methodId) => {
  // First, unset all default flags for this brand
  await query(
    'UPDATE payment_methods SET is_default = FALSE WHERE brand_id = $1',
    [brandId]
  );

  // Then set the new default
  const result = await query(
    `UPDATE payment_methods 
     SET is_default = TRUE 
     WHERE id = $1 AND brand_id = $2
     RETURNING *`,
    [methodId, brandId]
  );
  return result.rows[0];
};

/**
 * Delete payment method
 */
export const deletePaymentMethod = async (methodId) => {
  await query('DELETE FROM payment_methods WHERE id = $1', [methodId]);
};

// ============================================
// BILLING HISTORY
// ============================================

/**
 * Add billing record
 */
export const addBillingRecord = async (billingData) => {
  const result = await query(
    `INSERT INTO billing_history (
      brand_id, subscription_id, stripe_invoice_id, stripe_charge_id,
      amount, currency, status, invoice_pdf, hosted_invoice_url,
      billing_reason, period_start, period_end, paid_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      billingData.brand_id,
      billingData.subscription_id,
      billingData.stripe_invoice_id,
      billingData.stripe_charge_id,
      billingData.amount,
      billingData.currency || 'USD',
      billingData.status,
      billingData.invoice_pdf,
      billingData.hosted_invoice_url,
      billingData.billing_reason,
      billingData.period_start,
      billingData.period_end,
      billingData.paid_at
    ]
  );
  return result.rows[0];
};

/**
 * Get billing history by brand ID
 */
export const getBillingHistoryByBrandId = async (brandId, limit = 50, offset = 0) => {
  const result = await query(
    `SELECT * FROM billing_history 
     WHERE brand_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [brandId, limit, offset]
  );
  return result.rows;
};

/**
 * Get billing record by Stripe invoice ID
 */
export const getBillingRecordByStripeInvoiceId = async (stripeInvoiceId) => {
  const result = await query(
    'SELECT * FROM billing_history WHERE stripe_invoice_id = $1',
    [stripeInvoiceId]
  );
  return result.rows[0];
};

/**
 * Update billing record
 */
export const updateBillingRecord = async (stripeInvoiceId, updateData) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updateData.status !== undefined) {
    fields.push(`status = $${paramCount++}`);
    values.push(updateData.status);
  }
  if (updateData.paid_at !== undefined) {
    fields.push(`paid_at = $${paramCount++}`);
    values.push(updateData.paid_at);
  }
  if (updateData.invoice_pdf !== undefined) {
    fields.push(`invoice_pdf = $${paramCount++}`);
    values.push(updateData.invoice_pdf);
  }
  if (updateData.hosted_invoice_url !== undefined) {
    fields.push(`hosted_invoice_url = $${paramCount++}`);
    values.push(updateData.hosted_invoice_url);
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(stripeInvoiceId);

  const result = await query(
    `UPDATE billing_history 
     SET ${fields.join(', ')}
     WHERE stripe_invoice_id = $${paramCount}
     RETURNING *`,
    values
  );
  return result.rows[0];
};

// ============================================
// USAGE TRACKING
// ============================================

/**
 * Track usage metric
 */
export const trackUsage = async (usageData) => {
  const result = await query(
    `INSERT INTO usage_tracking (
      brand_id, subscription_id, metric_name, metric_value,
      period_start, period_end
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      usageData.brand_id,
      usageData.subscription_id,
      usageData.metric_name,
      usageData.metric_value,
      usageData.period_start,
      usageData.period_end
    ]
  );
  return result.rows[0];
};

/**
 * Get usage by brand and period
 */
export const getUsageByBrandAndPeriod = async (brandId, periodStart, periodEnd) => {
  const result = await query(
    `SELECT * FROM usage_tracking 
     WHERE brand_id = $1 
     AND period_start >= $2 
     AND period_end <= $3
     ORDER BY created_at DESC`,
    [brandId, periodStart, periodEnd]
  );
  return result.rows;
};

/**
 * Get current usage for brand
 */
export const getCurrentUsage = async (brandId) => {
  const result = await query(
    `SELECT metric_name, SUM(metric_value) as total_value
     FROM usage_tracking 
     WHERE brand_id = $1 
     AND period_end >= CURRENT_TIMESTAMP
     GROUP BY metric_name`,
    [brandId]
  );
  return result.rows;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if brand has active subscription
 */
export const hasActiveSubscription = async (brandId) => {
  const result = await query(
    `SELECT COUNT(*) as count FROM subscriptions 
     WHERE brand_id = $1 AND status IN ('active', 'trialing')`,
    [brandId]
  );
  return parseInt(result.rows[0].count) > 0;
};

/**
 * Get subscription limits for brand
 */
export const getSubscriptionLimits = async (brandId) => {
  const result = await query(
    `SELECT sp.max_clients, sp.max_projects, sp.max_storage_gb, sp.max_team_members
     FROM subscriptions s
     JOIN subscription_plans sp ON s.plan_id = sp.id
     WHERE s.brand_id = $1`,
    [brandId]
  );
  return result.rows[0];
};

/**
 * Check if brand can perform action based on limits
 */
export const checkLimit = async (brandId, limitType, currentCount) => {
  const limits = await getSubscriptionLimits(brandId);
  
  if (!limits) {
    return { allowed: false, reason: 'No active subscription' };
  }

  const limitValue = limits[`max_${limitType}`];
  
  // NULL means unlimited
  if (limitValue === null) {
    return { allowed: true, limit: null, current: currentCount };
  }

  if (currentCount >= limitValue) {
    return { 
      allowed: false, 
      reason: `Limit reached: ${currentCount}/${limitValue}`,
      limit: limitValue,
      current: currentCount
    };
  }

  return { 
    allowed: true, 
    limit: limitValue, 
    current: currentCount,
    remaining: limitValue - currentCount
  };
};
