-- Migration: 017_add_2fa_to_users.sql
-- Description: Add TOTP two-factor authentication fields to users table
-- Date: 2026-02-20

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS totp_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_backup_codes JSONB;
