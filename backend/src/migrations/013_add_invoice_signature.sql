-- Migration 013: Add e-signature columns to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS client_signature TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by_name VARCHAR(255);
