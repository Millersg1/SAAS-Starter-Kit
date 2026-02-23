-- Migration: 014_add_stripe_connect_to_brands.sql
-- Description: Add Stripe Connect Express columns to brands table
-- Date: 2026-02-20

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS stripe_account_id         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_connect_status     VARCHAR(30)
      DEFAULT 'not_connected'
      CHECK (stripe_connect_status IN (
          'not_connected','onboarding_started','pending_verification',
          'active','restricted','disabled'
      )),
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_created_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_brands_stripe_account_id
    ON brands(stripe_account_id)
    WHERE stripe_account_id IS NOT NULL;
