-- ===========================================
-- SaaS Starter Kit - Database Reset Script
-- ===========================================
-- ⚠️ WARNING: This will DELETE ALL DATA!
-- Run this before re-running schema.sql for a fresh start
-- ===========================================

-- Drop storage policies FIRST (before any tables)
DROP POLICY IF EXISTS "Anyone can view site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete site assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Drop all tables in correct order (respecting foreign keys)
-- CASCADE will automatically drop policies on these tables
DROP TABLE IF EXISTS public.ticket_replies CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.pending_signups CASCADE;
DROP TABLE IF EXISTS public.payment_plans CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.brand_members CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.site_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_plan_member_limit(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.can_invite_member(INT) CASCADE;
DROP FUNCTION IF EXISTS public.change_user_password(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.generate_slug(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_payment_plans_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_site_settings_updated_at() CASCADE;

-- Delete all users from auth.users
DELETE FROM auth.users;

-- Reset complete
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Database reset complete! Now run schema.sql';
END $$;
