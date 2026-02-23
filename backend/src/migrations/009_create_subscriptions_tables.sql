-- Migration: Create Subscriptions Tables
-- Description: Tables for subscription management with Stripe integration
-- Author: ClientHub Development Team
-- Date: 2026-02-17

-- ============================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('month', 'year')),
    features JSONB DEFAULT '{}',
    stripe_price_id VARCHAR(255),
    stripe_product_id VARCHAR(255),
    max_clients INTEGER,
    max_projects INTEGER,
    max_storage_gb INTEGER,
    max_team_members INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    ended_at TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id)  -- One active subscription per brand
);

-- ============================================
-- PAYMENT METHODS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    bank_name VARCHAR(255),
    bank_last4 VARCHAR(4),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BILLING HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('paid', 'open', 'void', 'uncollectible', 'draft')),
    invoice_pdf VARCHAR(500),
    hosted_invoice_url VARCHAR(500),
    billing_reason VARCHAR(100),
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USAGE TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

-- Subscription Plans
CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_price ON subscription_plans(price);

-- Subscriptions
CREATE INDEX idx_subscriptions_brand_id ON subscriptions(brand_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- Payment Methods
CREATE INDEX idx_payment_methods_brand_id ON payment_methods(brand_id);
CREATE INDEX idx_payment_methods_stripe_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(brand_id, is_default) WHERE is_default = TRUE;

-- Billing History
CREATE INDEX idx_billing_history_brand_id ON billing_history(brand_id);
CREATE INDEX idx_billing_history_subscription_id ON billing_history(subscription_id);
CREATE INDEX idx_billing_history_stripe_invoice_id ON billing_history(stripe_invoice_id);
CREATE INDEX idx_billing_history_status ON billing_history(status);
CREATE INDEX idx_billing_history_created_at ON billing_history(created_at DESC);

-- Usage Tracking
CREATE INDEX idx_usage_tracking_brand_id ON usage_tracking(brand_id);
CREATE INDEX idx_usage_tracking_subscription_id ON usage_tracking(subscription_id);
CREATE INDEX idx_usage_tracking_metric ON usage_tracking(metric_name);
CREATE INDEX idx_usage_tracking_period ON usage_tracking(period_start, period_end);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp for subscription_plans
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Update updated_at timestamp for subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscriptions_updated_at();

-- Update updated_at timestamp for payment_methods
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_methods_updated_at();

-- Ensure only one default payment method per brand
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE payment_methods 
        SET is_default = FALSE 
        WHERE brand_id = NEW.brand_id 
        AND id != NEW.id 
        AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_payment_method
    BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    WHEN (NEW.is_default = TRUE)
    EXECUTE FUNCTION ensure_single_default_payment_method();

-- ============================================
-- SEED DATA - SUBSCRIPTION PLANS
-- ============================================

INSERT INTO subscription_plans (name, slug, description, price, billing_interval, features, max_clients, max_projects, max_storage_gb, max_team_members, sort_order) VALUES
(
    'Basic',
    'basic-monthly',
    'Perfect for small agencies just getting started',
    29.00,
    'month',
    '{"client_portal": true, "custom_branding": false, "priority_support": false, "api_access": false, "white_label": false}',
    5,
    10,
    10,
    3,
    1
),
(
    'Basic Annual',
    'basic-yearly',
    'Perfect for small agencies just getting started (Annual billing)',
    290.00,
    'year',
    '{"client_portal": true, "custom_branding": false, "priority_support": false, "api_access": false, "white_label": false}',
    5,
    10,
    10,
    3,
    2
),
(
    'Pro',
    'pro-monthly',
    'For growing agencies with more clients',
    79.00,
    'month',
    '{"client_portal": true, "custom_branding": true, "priority_support": true, "api_access": true, "white_label": false}',
    25,
    50,
    50,
    10,
    3
),
(
    'Pro Annual',
    'pro-yearly',
    'For growing agencies with more clients (Annual billing)',
    790.00,
    'year',
    '{"client_portal": true, "custom_branding": true, "priority_support": true, "api_access": true, "white_label": false}',
    25,
    50,
    50,
    10,
    4
),
(
    'Enterprise',
    'enterprise-monthly',
    'For established agencies needing unlimited access',
    199.00,
    'month',
    '{"client_portal": true, "custom_branding": true, "priority_support": true, "api_access": true, "white_label": true}',
    NULL,  -- Unlimited
    NULL,  -- Unlimited
    NULL,  -- Unlimited
    NULL,  -- Unlimited
    5
),
(
    'Enterprise Annual',
    'enterprise-yearly',
    'For established agencies needing unlimited access (Annual billing)',
    1990.00,
    'year',
    '{"client_portal": true, "custom_branding": true, "priority_support": true, "api_access": true, "white_label": true}',
    NULL,  -- Unlimited
    NULL,  -- Unlimited
    NULL,  -- Unlimited
    NULL,  -- Unlimited
    6
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE subscription_plans IS 'Available subscription plans with pricing and features';
COMMENT ON TABLE subscriptions IS 'Active subscriptions linked to brands and Stripe';
COMMENT ON TABLE payment_methods IS 'Stored payment methods for recurring billing';
COMMENT ON TABLE billing_history IS 'Historical record of all billing transactions';
COMMENT ON TABLE usage_tracking IS 'Track usage metrics for billing and limits';

COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, past_due, canceled, incomplete, trialing, unpaid';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'If true, subscription will cancel at end of current period';
COMMENT ON COLUMN payment_methods.is_default IS 'Default payment method for the brand';
COMMENT ON COLUMN billing_history.billing_reason IS 'Reason for invoice: subscription_create, subscription_cycle, subscription_update, etc.';
