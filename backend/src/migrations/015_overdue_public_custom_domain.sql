-- Migration: 015_overdue_public_custom_domain.sql
-- Description: Add last_reminder_sent + public_token to invoices, custom_domain to brands
-- Date: 2026-02-20

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP,
  ADD COLUMN IF NOT EXISTS public_token       VARCHAR(64) UNIQUE;

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_invoices_public_token
    ON invoices(public_token)
    WHERE public_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brands_custom_domain
    ON brands(custom_domain)
    WHERE custom_domain IS NOT NULL;
