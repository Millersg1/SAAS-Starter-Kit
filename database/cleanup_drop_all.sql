-- =============================================================================
-- ClientHub — DROP ALL TABLES (cleanup before re-running combined_migration.sql)
--
-- Run this FIRST if a previous migration attempt failed partway through.
-- CASCADE automatically handles foreign key dependencies.
-- After this runs successfully, run combined_migration.sql.
-- =============================================================================

DROP TABLE IF EXISTS time_entries        CASCADE;
DROP TABLE IF EXISTS proposal_items      CASCADE;
DROP TABLE IF EXISTS proposals           CASCADE;
DROP TABLE IF EXISTS audit_logs          CASCADE;
DROP TABLE IF EXISTS usage_tracking      CASCADE;
DROP TABLE IF EXISTS billing_history     CASCADE;
DROP TABLE IF EXISTS payment_methods     CASCADE;
DROP TABLE IF EXISTS subscriptions       CASCADE;
DROP TABLE IF EXISTS subscription_plans  CASCADE;
DROP TABLE IF EXISTS payments            CASCADE;
DROP TABLE IF EXISTS invoice_items       CASCADE;
DROP TABLE IF EXISTS invoices            CASCADE;
DROP TABLE IF EXISTS message_participants CASCADE;
DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS messages            CASCADE;
DROP TABLE IF EXISTS message_threads     CASCADE;
DROP TABLE IF EXISTS document_versions   CASCADE;
DROP TABLE IF EXISTS document_shares     CASCADE;
DROP TABLE IF EXISTS documents           CASCADE;
DROP TABLE IF EXISTS project_updates     CASCADE;
DROP TABLE IF EXISTS projects            CASCADE;
DROP TABLE IF EXISTS clients             CASCADE;
DROP TABLE IF EXISTS brand_members       CASCADE;
DROP TABLE IF EXISTS brands              CASCADE;
DROP TABLE IF EXISTS users               CASCADE;
