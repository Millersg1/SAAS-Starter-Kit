-- ===========================================
-- SaaS Starter Kit - Database Schema
-- ===========================================
-- Run this in Supabase SQL Editor on a fresh project
-- All tables use INT (SERIAL) primary keys for performance
-- Tables with public exposure have UUID public_id
-- ===========================================

-- ===========================================
-- PROFILES TABLE
-- ===========================================
-- Extends auth.users with additional user data
-- Note: profiles.id MUST be UUID to reference auth.users

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    current_brand_id INT, -- Will add FK after brands table is created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_current_brand ON public.profiles(current_brand_id);

-- ===========================================
-- BRANDS TABLE
-- ===========================================
-- Organizations/companies that users can belong to

CREATE TABLE IF NOT EXISTS public.brands (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT brands_name_unique UNIQUE (name),
    CONSTRAINT brands_slug_unique UNIQUE (slug)
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_brands_slug ON public.brands(slug);
CREATE INDEX idx_brands_name ON public.brands(name);
CREATE INDEX idx_brands_public_id ON public.brands(public_id);

-- Add FK from profiles to brands now that brands exists
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_current_brand 
FOREIGN KEY (current_brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- BRAND MEMBERS TABLE
-- ===========================================
-- Links users to brands with role-based access

CREATE TABLE IF NOT EXISTS public.brand_members (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
    invited_email TEXT,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT brand_members_unique UNIQUE NULLS NOT DISTINCT (brand_id, user_id)
);

ALTER TABLE public.brand_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_brand_members_brand_id ON public.brand_members(brand_id);
CREATE INDEX idx_brand_members_user_id ON public.brand_members(user_id);
CREATE INDEX idx_brand_members_invited_email ON public.brand_members(invited_email);

-- Prevent duplicate invites per brand
CREATE UNIQUE INDEX idx_brand_members_invite_unique 
    ON public.brand_members(brand_id, invited_email) 
    WHERE invited_email IS NOT NULL;

-- ===========================================
-- SUBSCRIPTIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id SERIAL PRIMARY KEY,
    brand_id INT REFERENCES public.brands(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    converted_from_trial BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_brand_id ON public.subscriptions(brand_id);
CREATE INDEX idx_subscriptions_cancelled_at ON public.subscriptions(cancelled_at) WHERE cancelled_at IS NOT NULL;
CREATE INDEX idx_subscriptions_trial_ends_at ON public.subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL AND status = 'active';

COMMENT ON COLUMN public.subscriptions.cancelled_at IS 'Timestamp when subscription was cancelled (NULL if active)';
COMMENT ON COLUMN public.subscriptions.trial_ends_at IS 'Timestamp when trial period ends (NULL if not on trial)';
COMMENT ON COLUMN public.subscriptions.converted_from_trial IS 'True if this subscription started as a trial and converted to paid';

-- ===========================================
-- PAYMENT PLANS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.payment_plans (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly INTEGER DEFAULT 0,
    price_yearly INTEGER DEFAULT 0,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    trial_days INTEGER DEFAULT 0,
    trial_enabled BOOLEAN DEFAULT false,
    limit_members INTEGER,
    limit_projects INTEGER,
    limit_api_requests INTEGER,
    features JSONB DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_payment_plans_slug ON public.payment_plans(slug);
CREATE INDEX idx_payment_plans_active ON public.payment_plans(is_active);
CREATE INDEX idx_payment_plans_sort ON public.payment_plans(sort_order);
CREATE INDEX idx_payment_plans_public_id ON public.payment_plans(public_id);

-- ===========================================
-- PENDING SIGNUPS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.pending_signups (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    brand_name TEXT NOT NULL,
    password TEXT NOT NULL,
    plan_slug TEXT NOT NULL,
    billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
    stripe_checkout_session_id TEXT UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pending_signups_email ON public.pending_signups(email);
CREATE INDEX idx_pending_signups_session ON public.pending_signups(stripe_checkout_session_id);
CREATE INDEX idx_pending_signups_expires ON public.pending_signups(expires_at);

-- RLS Policies: Only service role can access this table (backend only)
-- No user-facing access allowed since it contains sensitive data
CREATE POLICY "Service role can manage pending signups"
    ON public.pending_signups
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- updated_at trigger for payment_plans
CREATE OR REPLACE FUNCTION update_payment_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_plans_updated_at
    BEFORE UPDATE ON public.payment_plans
    FOR EACH ROW EXECUTE FUNCTION update_payment_plans_updated_at();

-- Add FK from subscriptions.plan to payment_plans.slug for analytics joins
ALTER TABLE public.subscriptions 
ADD CONSTRAINT fk_subscriptions_plan 
FOREIGN KEY (plan) REFERENCES public.payment_plans(slug);

-- ===========================================
-- EMAIL TEMPLATES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.email_templates (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_templates_slug ON public.email_templates(slug);

COMMENT ON TABLE public.email_templates IS 'Customizable transactional email templates';

-- ===========================================
-- SUPPORT TICKETS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    brand_id INT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_support_tickets_brand_id ON public.support_tickets(brand_id);
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_public_id ON public.support_tickets(public_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);

-- ===========================================
-- TICKET REPLIES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.ticket_replies (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ticket_replies_ticket_id ON public.ticket_replies(ticket_id);

-- ===========================================
-- SITE SETTINGS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    company_name TEXT NOT NULL DEFAULT 'SaaS Starter Kit',
    short_name TEXT NOT NULL DEFAULT 'SSK',
    tagline TEXT DEFAULT 'From vibe-coded prototype to deployed SaaS in 60 minutes',
    support_email TEXT DEFAULT 'support@example.com',
    logo_url TEXT,
    favicon_url TEXT,
    email_domain TEXT DEFAULT 'resend.dev',
    email_from_address TEXT DEFAULT 'noreply',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- FUNCTION: Handle new user signup
-- ===========================================
-- Admin is detected by email: admin@admin.com

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
    new_brand_id INT;
    user_name TEXT;
    brand_name TEXT;
    brand_slug TEXT;
BEGIN
    -- Determine role
    user_role := CASE 
        WHEN NEW.email = 'admin@admin.com' THEN 'admin'
        ELSE 'user'
    END;
    
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    -- Create profile (no RLS check needed - SECURITY DEFINER bypasses it)
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, user_name, user_role);
    
    -- For non-admin users, create a brand using the name from signup
    IF user_role = 'user' THEN
        -- Get brand name from signup metadata (required during signup)
        brand_name := NEW.raw_user_meta_data->>'brand_name';
        brand_slug := LOWER(REPLACE(COALESCE(brand_name, user_name), ' ', '-')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
        
        INSERT INTO public.brands (name, slug, owner_id)
        VALUES (brand_name, brand_slug, NEW.id)
        RETURNING id INTO new_brand_id;
        
        -- Add user as brand admin (with joined_at set so they're not "pending")
        INSERT INTO public.brand_members (brand_id, user_id, role, joined_at)
        VALUES (new_brand_id, NEW.id, 'admin', NOW());
        
        -- Update profile with current brand
        UPDATE public.profiles SET current_brand_id = new_brand_id WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- FUNCTION: Check if user is admin (no params - uses auth.uid())
-- ===========================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Overload with user_id parameter
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FUNCTION: Check if user is member of a brand (bypasses RLS)
-- ===========================================

CREATE OR REPLACE FUNCTION public.is_brand_member(p_user_id UUID, p_brand_id INT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.brand_members
        WHERE user_id = p_user_id AND brand_id = p_brand_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FUNCTION: Check if user is admin of a brand (bypasses RLS)
-- ===========================================

CREATE OR REPLACE FUNCTION public.is_brand_admin(p_user_id UUID, p_brand_id INT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.brand_members
        WHERE user_id = p_user_id AND brand_id = p_brand_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FUNCTION: Check if users share a brand (bypasses RLS)
-- ===========================================

CREATE OR REPLACE FUNCTION public.shares_brand_with(p_viewer_id UUID, p_target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Same user
    IF p_viewer_id = p_target_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if they share any brand
    RETURN EXISTS (
        SELECT 1 FROM public.brand_members bm1
        JOIN public.brand_members bm2 ON bm1.brand_id = bm2.brand_id
        WHERE bm1.user_id = p_viewer_id
        AND bm2.user_id = p_target_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FUNCTION: Get plan member limit
-- ===========================================

CREATE OR REPLACE FUNCTION public.get_plan_member_limit(plan_name TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE plan_name
        WHEN 'free' THEN 1
        WHEN 'starter' THEN 3
        WHEN 'pro' THEN 10
        ELSE 1
    END;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- FUNCTION: Check if brand can invite more members
-- ===========================================

CREATE OR REPLACE FUNCTION public.can_invite_member(p_brand_id INT)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    member_limit INTEGER;
    brand_plan TEXT;
BEGIN
    SELECT COUNT(*) INTO current_count
    FROM public.brand_members
    WHERE brand_id = p_brand_id AND joined_at IS NOT NULL;
    
    SELECT COALESCE(s.plan, 'free') INTO brand_plan
    FROM public.subscriptions s
    WHERE s.brand_id = p_brand_id;
    
    IF brand_plan IS NULL THEN
        brand_plan := 'free';
    END IF;
    
    member_limit := public.get_plan_member_limit(brand_plan);
    
    RETURN current_count < member_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FUNCTION: Change user password
-- ===========================================

CREATE OR REPLACE FUNCTION public.change_user_password(
    current_password TEXT,
    new_password TEXT
)
RETURNS JSON AS $$
DECLARE
    user_id UUID;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FUNCTION: Prevent role escalation
-- ===========================================
-- Prevents users from changing their own role to admin.
-- Only existing admins or service role can change roles.

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
    caller_is_admin BOOLEAN;
BEGIN
    -- If role hasn't changed, allow the update
    IF OLD.role = NEW.role THEN
        RETURN NEW;
    END IF;
    
    -- Check if the caller is an admin (if auth.uid() is set)
    IF auth.uid() IS NOT NULL THEN
        SELECT role = 'admin' INTO caller_is_admin
        FROM public.profiles
        WHERE id = auth.uid();
        
        -- If caller is not an admin and is trying to change their own role, deny
        IF caller_is_admin IS NOT TRUE THEN
            RAISE EXCEPTION 'Only administrators can change user roles';
        END IF;
    END IF;
    -- If auth.uid() IS NULL, it's service role/trigger, allow it
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_role_escalation_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- ===========================================
-- RLS POLICIES: PROFILES
-- ===========================================
-- Note: We use public.is_admin() which is SECURITY DEFINER to avoid recursion

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin(auth.uid()));

-- Allow profile creation on signup (auth.uid() IS NULL for service role/trigger)
CREATE POLICY "Allow profile creation on signup"
    ON public.profiles FOR INSERT
    WITH CHECK (
        -- User creating own profile
        auth.uid() = id
        OR
        -- Service role / trigger (auth.uid() is NULL during signup)
        auth.uid() IS NULL
    );

-- ===========================================
-- RLS POLICIES: BRANDS
-- ===========================================

CREATE POLICY "Users can view brands they belong to"
    ON public.brands FOR SELECT
    USING (
        id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all brands"
    ON public.brands FOR SELECT
    USING (public.is_admin(auth.uid()));

-- Allow brand creation (auth.uid() IS NULL for trigger)
CREATE POLICY "Allow brand creation"
    ON public.brands FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        OR
        auth.uid() IS NULL  -- Service role / trigger
    );

CREATE POLICY "Brand admins can update brands"
    ON public.brands FOR UPDATE
    USING (
        public.is_admin(auth.uid()) OR
        id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ===========================================
-- RLS POLICIES: BRAND MEMBERS
-- ===========================================
-- CRITICAL: These policies must NOT query brand_members within themselves
-- to avoid infinite recursion. Use is_admin() or direct user_id checks only.

-- Users can always see their own membership
CREATE POLICY "Users can view own membership"
    ON public.brand_members FOR SELECT
    USING (user_id = auth.uid());

-- Allow member creation (auth.uid() IS NULL for service role/trigger)
CREATE POLICY "Allow membership creation"
    ON public.brand_members FOR INSERT
    WITH CHECK (
        -- User is creating their own membership
        user_id = auth.uid()
        OR
        -- Admin is inviting someone
        public.is_brand_admin(auth.uid(), brand_id)
        OR
        -- Service role / trigger (auth.uid() is NULL during signup)
        auth.uid() IS NULL
    );

-- Brand admins can view all members of their brand (including pending invites)
CREATE POLICY "Brand admins can view brand members"
    ON public.brand_members FOR SELECT
    USING (public.is_brand_admin(auth.uid(), brand_id));

-- Brand admins can update members in their brand
CREATE POLICY "Brand admins can update brand members"
    ON public.brand_members FOR UPDATE
    USING (public.is_brand_admin(auth.uid(), brand_id));

-- Brand admins can delete members from their brand (except themselves)
CREATE POLICY "Brand admins can delete brand members"
    ON public.brand_members FOR DELETE
    USING (
        public.is_brand_admin(auth.uid(), brand_id)
        AND user_id IS DISTINCT FROM auth.uid()
    );

-- System admins can do everything on brand_members
CREATE POLICY "Admins can manage all brand members"
    ON public.brand_members FOR ALL
    USING (public.is_admin(auth.uid()));

-- ===========================================
-- RLS POLICIES: SUBSCRIPTIONS
-- ===========================================

CREATE POLICY "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can create subscriptions"
    ON public.subscriptions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update subscriptions"
    ON public.subscriptions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete subscriptions"
    ON public.subscriptions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow service role (used by Edge Functions and webhooks)
CREATE POLICY "Service role can manage subscriptions"
    ON public.subscriptions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ===========================================
-- RLS POLICIES: PAYMENT PLANS
-- ===========================================

CREATE POLICY "Anyone can view active payment plans"
    ON public.payment_plans FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can view all payment plans"
    ON public.payment_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can create payment plans"
    ON public.payment_plans FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update payment plans"
    ON public.payment_plans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete payment plans"
    ON public.payment_plans FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ===========================================
-- RLS POLICIES: EMAIL TEMPLATES
-- ===========================================

CREATE POLICY "Admins can manage email templates"
    ON public.email_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ===========================================
-- RLS POLICIES: SUPPORT TICKETS
-- ===========================================

CREATE POLICY "Users can view own brand tickets"
    ON public.support_tickets FOR SELECT
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create tickets for own brand"
    ON public.support_tickets FOR INSERT
    WITH CHECK (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update own brand tickets"
    ON public.support_tickets FOR UPDATE
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own brand tickets"
    ON public.support_tickets FOR DELETE
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all tickets"
    ON public.support_tickets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ===========================================
-- RLS POLICIES: TICKET REPLIES
-- ===========================================

CREATE POLICY "Users can view replies on accessible tickets"
    ON public.ticket_replies FOR SELECT
    USING (
        ticket_id IN (
            SELECT id FROM public.support_tickets st
            WHERE st.brand_id IN (
                SELECT brand_id FROM public.brand_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can reply to accessible tickets"
    ON public.ticket_replies FOR INSERT
    WITH CHECK (
        ticket_id IN (
            SELECT id FROM public.support_tickets st
            WHERE st.brand_id IN (
                SELECT brand_id FROM public.brand_members 
                WHERE user_id = auth.uid()
            )
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Admins can manage all replies"
    ON public.ticket_replies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ===========================================
-- RLS POLICIES: SITE SETTINGS
-- ===========================================

CREATE POLICY "Anyone can read site settings"
    ON public.site_settings FOR SELECT
    USING (true);

CREATE POLICY "Admins can update site settings"
    ON public.site_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert site settings"
    ON public.site_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- updated_at trigger for site_settings
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();

-- ===========================================
-- STORAGE BUCKETS
-- ===========================================

-- Site assets bucket (logo, favicon)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view site assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can upload site assets"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'site-assets' AND
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

CREATE POLICY "Admins can update site assets"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'site-assets' AND
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete site assets"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'site-assets' AND
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ===========================================
-- SEED DATA: SITE SETTINGS
-- ===========================================

INSERT INTO public.site_settings (id, company_name, short_name, tagline, support_email, email_domain, email_from_address)
VALUES (1, 'SaaS Starter Kit', 'SSK', 'From vibe-coded prototype to deployed SaaS in 60 minutes', 'support@example.com', 'resend.dev', 'noreply')
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- SEED DATA: PAYMENT PLANS
-- ===========================================

INSERT INTO public.payment_plans (slug, name, description, price_monthly, price_yearly, limit_members, features, is_popular, sort_order)
VALUES 
    (
        'free',
        'Free',
        'Perfect for trying out SSK',
        0,
        0,
        1,
        '["1 team member", "Community support", "Basic analytics"]'::jsonb,
        false,
        0
    ),
    (
        'starter',
        'Starter',
        'For growing teams',
        1900,
        19000,
        5,
        '["5 team members", "Email support", "Advanced analytics", "Custom domain"]'::jsonb,
        true,
        1
    ),
    (
        'pro',
        'Pro',
        'For scaling businesses',
        4900,
        49000,
        NULL,
        '["Unlimited team members", "Priority support", "Advanced analytics", "Custom domain", "API access", "SSO (coming soon)"]'::jsonb,
        false,
        2
    )
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- SEED DATA: EMAIL TEMPLATES
-- ===========================================

INSERT INTO public.email_templates (slug, name, subject, body_html, variables) VALUES
(
    'welcome',
    'Welcome Email',
    'Welcome to {{siteName}}!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to {{siteName}}!</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi {{userName}},</p>
        <p style="font-size: 16px; margin-bottom: 20px;">Thanks for signing up! We''re excited to have you on board. 🎉</p>
        <p style="font-size: 16px; margin-bottom: 20px;">Here are some quick links to get you started:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;"><a href="{{siteUrl}}/dashboard" style="color: #667eea; text-decoration: none;">Go to Dashboard</a></li>
                <li style="margin-bottom: 10px;"><a href="{{siteUrl}}/docs" style="color: #667eea; text-decoration: none;">View Documentation</a></li>
                <li style="margin-bottom: 10px;"><a href="{{siteUrl}}/dashboard/support" style="color: #667eea; text-decoration: none;">Get Support</a></li>
            </ul>
        </div>
        <p style="font-size: 16px; margin-bottom: 20px;">If you have any questions, just reply to this email.</p>
        <p style="font-size: 16px; margin-bottom: 5px;">Best regards,<br>The {{siteName}} Team</p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p>© {{year}} {{siteName}}. All rights reserved.</p>
    </div>
</body>
</html>',
    ARRAY['userName', 'siteName', 'siteUrl', 'year']
),
(
    'brand_invite',
    'Brand Invitation',
    'You''ve been invited to join {{brandName}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Brand Invitation</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 20px;"><strong>{{inviterName}}</strong> has invited you to join <strong>{{brandName}}</strong> on {{siteName}}.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{inviteUrl}}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Accept Invitation</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">This invitation link will expire in 7 days.</p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p>© {{year}} {{siteName}}. All rights reserved.</p>
    </div>
</body>
</html>',
    ARRAY['brandName', 'inviterName', 'inviteUrl', 'siteName', 'year']
),
(
    'payment_failed',
    'Payment Failed',
    'Payment Failed - Action Required',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #dc2626; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Payment Failed</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi {{userName}},</p>
        <p style="font-size: 16px; margin-bottom: 20px;">We were unable to process your recent payment of <strong>{{amount}}</strong>.</p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;"><strong>Action Required:</strong> Please update your payment method to avoid service interruption.</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{updatePaymentUrl}}" style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Update Payment Method</a>
        </div>
        <p style="font-size: 16px; margin-top: 20px;">Best regards,<br>The {{siteName}} Team</p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p>© {{year}} {{siteName}}. All rights reserved.</p>
    </div>
</body>
</html>',
    ARRAY['userName', 'amount', 'updatePaymentUrl', 'siteName', 'year']
)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- SEED DATA: DEFAULT ADMIN USER
-- ===========================================
-- Email: admin@admin.com
-- Password: Admin123!
-- 
-- To change: Update the email and password below
-- ===========================================

-- Only insert if admin doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@admin.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'admin@admin.com',
            crypt('Admin123!', gen_salt('bf')),  -- Password generated dynamically
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Admin"}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );
    END IF;
END $$;

-- ===========================================
-- SCHEMA COMPLETE
-- ===========================================
-- Tables: 8 (profiles, brands, brand_members, subscriptions, 
--            payment_plans, email_templates, support_tickets, 
--            ticket_replies, site_settings)
--
-- Default Admin:
--   Email: admin@admin.com
--   Password: Admin123!
-- ===========================================
