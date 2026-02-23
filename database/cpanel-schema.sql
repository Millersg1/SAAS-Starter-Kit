-- ===========================================
-- ClientHub - cPanel PostgreSQL Schema
-- ===========================================
-- Database: faithharborclien_clienthub
-- User: faithharborclien_usercliENt
-- ===========================================
-- This schema is modified for self-hosted PostgreSQL
-- Removes Supabase-specific features (RLS, auth.users, storage)
-- ===========================================

-- ===========================================
-- EXTENSIONS
-- ===========================================
-- Note: If you get permission errors, ask your hosting provider to enable these extensions
-- Or run these commands as superuser separately

DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN 
        RAISE NOTICE 'Extension uuid-ossp already exists or requires superuser privileges';
END $$;

DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN 
        RAISE NOTICE 'Extension pgcrypto already exists or requires superuser privileges';
END $$;

-- ===========================================
-- USERS TABLE
-- ===========================================
-- Replaces Supabase auth.users

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    email_verified BOOLEAN DEFAULT false,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_uuid ON users(uuid);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_reset_token ON users(password_reset_token);

-- ===========================================
-- PROFILES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_uuid UUID UNIQUE NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    current_brand_id INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_uuid ON profiles(user_uuid);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_current_brand ON profiles(current_brand_id);

-- ===========================================
-- BRANDS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    owner_uuid UUID REFERENCES users(uuid) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT brands_name_unique UNIQUE (name),
    CONSTRAINT brands_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_name ON brands(name);
CREATE INDEX idx_brands_public_id ON brands(public_id);
CREATE INDEX idx_brands_owner ON brands(owner_uuid);

-- Add FK from profiles to brands
ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_current_brand 
FOREIGN KEY (current_brand_id) REFERENCES brands(id) ON DELETE SET NULL;

-- ===========================================
-- BRAND MEMBERS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS brand_members (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    invited_by UUID REFERENCES users(uuid) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT brand_members_unique UNIQUE (brand_id, user_uuid)
);

CREATE INDEX idx_brand_members_brand ON brand_members(brand_id);
CREATE INDEX idx_brand_members_user ON brand_members(user_uuid);
CREATE INDEX idx_brand_members_role ON brand_members(role);

-- ===========================================
-- PAYMENT PLANS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS payment_plans (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
    features JSONB DEFAULT '[]',
    stripe_price_id TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    limit_clients INTEGER,
    limit_projects INTEGER,
    limit_storage_gb DECIMAL(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_plans_slug ON payment_plans(slug);
CREATE INDEX idx_payment_plans_active ON payment_plans(is_active);

-- ===========================================
-- SUBSCRIPTIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT subscriptions_brand_unique UNIQUE (brand_id)
);

CREATE INDEX idx_subscriptions_brand ON subscriptions(brand_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- ===========================================
-- CLIENTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    portal_access BOOLEAN DEFAULT true,
    portal_password_hash TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT clients_brand_email_unique UNIQUE (brand_id, email)
);

CREATE INDEX idx_clients_brand_id ON clients(brand_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_public_id ON clients(public_id);
CREATE INDEX idx_clients_tags ON clients USING GIN(tags);

-- ===========================================
-- PROJECTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    client_id INT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    start_date DATE,
    end_date DATE,
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    budget_amount DECIMAL(10, 2),
    currency TEXT DEFAULT 'USD',
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    tags TEXT[] DEFAULT '{}',
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_projects_brand_id ON projects(brand_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_public_id ON projects(public_id);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

-- ===========================================
-- PROJECT UPDATES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS project_updates (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    update_type TEXT NOT NULL DEFAULT 'general' CHECK (update_type IN ('general', 'milestone', 'issue', 'completion')),
    visible_to_client BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_updates_project_id ON project_updates(project_id);
CREATE INDEX idx_project_updates_user_uuid ON project_updates(user_uuid);
CREATE INDEX idx_project_updates_type ON project_updates(update_type);
CREATE INDEX idx_project_updates_visible ON project_updates(visible_to_client);

-- ===========================================
-- DOCUMENTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    client_id INT REFERENCES clients(id) ON DELETE CASCADE,
    project_id INT REFERENCES projects(id) ON DELETE SET NULL,
    uploaded_by UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_type TEXT DEFAULT 'local' CHECK (storage_type IN ('local', 's3')),
    folder TEXT DEFAULT '/',
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    shared_with_client BOOLEAN DEFAULT false,
    download_count INT DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    version INT DEFAULT 1,
    previous_version_id INT REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_brand_id ON documents(brand_id);
CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_public_id ON documents(public_id);
CREATE INDEX idx_documents_folder ON documents(folder);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_expires ON documents(expires_at) WHERE expires_at IS NOT NULL;

-- ===========================================
-- MESSAGES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    client_id INT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    project_id INT REFERENCES projects(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('agency', 'client')),
    sender_user_uuid UUID REFERENCES users(uuid) ON DELETE SET NULL,
    sender_client_id INT REFERENCES clients(id) ON DELETE SET NULL,
    parent_message_id INT REFERENCES messages(id) ON DELETE CASCADE,
    thread_id INT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    has_attachments BOOLEAN DEFAULT false,
    attachment_ids INT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_brand_id ON messages(brand_id);
CREATE INDEX idx_messages_client_id ON messages(client_id);
CREATE INDEX idx_messages_project_id ON messages(project_id);
CREATE INDEX idx_messages_sender_user ON messages(sender_user_uuid);
CREATE INDEX idx_messages_sender_client ON messages(sender_client_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE INDEX idx_messages_public_id ON messages(public_id);
CREATE INDEX idx_messages_unread ON messages(is_read) WHERE is_read = false;

-- ===========================================
-- INVOICES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    client_id INT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    project_id INT REFERENCES projects(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date DATE,
    payment_method TEXT,
    stripe_invoice_id TEXT,
    stripe_payment_intent_id TEXT,
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    CONSTRAINT invoices_brand_number_unique UNIQUE (brand_id, invoice_number)
);

CREATE INDEX idx_invoices_brand_id ON invoices(brand_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_public_id ON invoices(public_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);

-- ===========================================
-- INVOICE ITEMS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_sort ON invoice_items(sort_order);

-- ===========================================
-- CLIENT PORTAL SETTINGS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS client_portal_settings (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE UNIQUE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#667eea',
    secondary_color TEXT DEFAULT '#764ba2',
    custom_domain TEXT,
    subdomain TEXT,
    welcome_message TEXT,
    footer_text TEXT,
    show_powered_by BOOLEAN DEFAULT true,
    enable_messaging BOOLEAN DEFAULT true,
    enable_document_downloads BOOLEAN DEFAULT true,
    enable_invoice_payments BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_settings_brand_id ON client_portal_settings(brand_id);
CREATE INDEX idx_portal_settings_subdomain ON client_portal_settings(subdomain);
CREATE INDEX idx_portal_settings_domain ON client_portal_settings(custom_domain);

-- ===========================================
-- SUPPORT TICKETS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    brand_id INT REFERENCES brands(id) ON DELETE CASCADE,
    user_uuid UUID REFERENCES users(uuid) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(uuid) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_support_tickets_brand ON support_tickets(brand_id);
CREATE INDEX idx_support_tickets_user ON support_tickets(user_uuid);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_public_id ON support_tickets(public_id);

-- ===========================================
-- TICKET REPLIES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS ticket_replies (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_replies_ticket ON ticket_replies(ticket_id);
CREATE INDEX idx_ticket_replies_user ON ticket_replies(user_uuid);

-- ===========================================
-- EMAIL TEMPLATES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_templates_slug ON email_templates(slug);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);

-- ===========================================
-- SITE SETTINGS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_site_settings_key ON site_settings(key);
CREATE INDEX idx_site_settings_public ON site_settings(is_public);

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Function: Generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Function: Check if brand can add more clients
CREATE OR REPLACE FUNCTION can_add_client(p_brand_id INT)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    client_limit INTEGER;
    brand_plan TEXT;
BEGIN
    SELECT COUNT(*) INTO current_count
    FROM clients
    WHERE brand_id = p_brand_id AND status != 'archived';
    
    SELECT COALESCE(s.plan, 'free') INTO brand_plan
    FROM subscriptions s
    WHERE s.brand_id = p_brand_id;
    
    IF brand_plan IS NULL THEN
        brand_plan := 'free';
    END IF;
    
    SELECT limit_clients INTO client_limit
    FROM payment_plans
    WHERE slug = brand_plan;
    
    IF client_limit IS NULL THEN
        RETURN true;
    END IF;
    
    RETURN current_count < client_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get brand storage usage in GB
CREATE OR REPLACE FUNCTION get_storage_usage_gb(p_brand_id INT)
RETURNS DECIMAL AS $$
DECLARE
    total_bytes BIGINT;
BEGIN
    SELECT COALESCE(SUM(file_size), 0) INTO total_bytes
    FROM documents
    WHERE brand_id = p_brand_id;
    
    RETURN (total_bytes::DECIMAL / 1073741824)::DECIMAL(10, 2);
END;
$$ LANGUAGE plpgsql;

-- Function: Check if brand can upload file
CREATE OR REPLACE FUNCTION can_upload_file(p_brand_id INT, p_file_size_bytes BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage_gb DECIMAL;
    storage_limit_gb DECIMAL;
    brand_plan TEXT;
    new_usage_gb DECIMAL;
BEGIN
    current_usage_gb := get_storage_usage_gb(p_brand_id);
    
    SELECT COALESCE(s.plan, 'free') INTO brand_plan
    FROM subscriptions s
    WHERE s.brand_id = p_brand_id;
    
    IF brand_plan IS NULL THEN
        brand_plan := 'free';
    END IF;
    
    SELECT limit_storage_gb INTO storage_limit_gb
    FROM payment_plans
    WHERE slug = brand_plan;
    
    IF storage_limit_gb IS NULL THEN
        RETURN true;
    END IF;
    
    new_usage_gb := current_usage_gb + (p_file_size_bytes::DECIMAL / 1073741824);
    
    RETURN new_usage_gb <= storage_limit_gb;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_brand_id INT)
RETURNS TEXT AS $$
DECLARE
    next_number INT;
    year_prefix TEXT;
BEGIN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number LIKE year_prefix || '-%'
            THEN CAST(SUBSTRING(invoice_number FROM LENGTH(year_prefix) + 2) AS INT)
            ELSE 0
        END
    ), 0) + 1 INTO next_number
    FROM invoices
    WHERE brand_id = p_brand_id;
    
    RETURN year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- UPDATED_AT TRIGGERS
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_members_updated_at
    BEFORE UPDATE ON brand_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_plans_updated_at
    BEFORE UPDATE ON payment_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_updates_updated_at
    BEFORE UPDATE ON project_updates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portal_settings_updated_at
    BEFORE UPDATE ON client_portal_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- SEED DATA: PAYMENT PLANS
-- ===========================================

INSERT INTO payment_plans (slug, name, description, price, interval, limit_clients, limit_projects, limit_storage_gb, features, sort_order)
VALUES 
(
    'free',
    'Free',
    'Perfect for trying out ClientHub',
    0.00,
    'month',
    1,
    1,
    0.1,
    '["1 client", "1 project", "100MB storage", "Basic branding", "Email support"]'::jsonb,
    1
),
(
    'starter',
    'Starter',
    'Great for small agencies and freelancers',
    29.00,
    'month',
    10,
    NULL,
    5,
    '["10 clients", "Unlimited projects", "5GB storage", "Custom branding", "Remove powered by", "Priority email support"]'::jsonb,
    2
),
(
    'pro',
    'Pro',
    'For growing agencies',
    79.00,
    'month',
    NULL,
    NULL,
    50,
    '["Unlimited clients", "Unlimited projects", "50GB storage", "Custom domain", "White-label branding", "API access", "Priority support", "Advanced analytics"]'::jsonb,
    3
)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- SEED DATA: DEFAULT ADMIN USER
-- ===========================================

INSERT INTO users (uuid, email, password_hash, full_name, role, email_verified)
VALUES (
    uuid_generate_v4(),
    'admin@clienthub.com',
    crypt('Admin123!', gen_salt('bf')),
    'Admin User',
    'admin',
    true
)
ON CONFLICT (email) DO NOTHING;

-- Create profile for admin
INSERT INTO profiles (user_uuid, email, full_name, role)
SELECT uuid, email, full_name, role
FROM users
WHERE email = 'admin@clienthub.com'
ON CONFLICT (user_uuid) DO NOTHING;

-- ===========================================
-- SCHEMA COMPLETE
-- ===========================================
-- Tables: 18 total
-- - 3 auth tables (users, profiles, brands)
-- - 7 ClientHub tables (clients, projects, documents, messages, invoices, etc.)
-- - 8 supporting tables (subscriptions, payment_plans, support, etc.)
--
-- Default Admin:
--   Email: admin@clienthub.com
--   Password: Admin123!
-- ===========================================
