-- ClientHub Database Schema for cPanel
-- Run this in psql command line or import as SQL file

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
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

-- Create profiles table
CREATE TABLE profiles (
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

-- Create brands table
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    owner_uuid UUID REFERENCES users(uuid) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brands_slug ON brands(slug);

-- Add foreign key to profiles
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_current_brand 
FOREIGN KEY (current_brand_id) REFERENCES brands(id) ON DELETE SET NULL;

-- Create brand_members table
CREATE TABLE brand_members (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    invited_by UUID REFERENCES users(uuid) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (brand_id, user_uuid)
);

-- Create payment_plans table
CREATE TABLE payment_plans (
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

-- Create subscriptions table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL UNIQUE REFERENCES brands(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create clients table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
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
    UNIQUE (brand_id, email)
);

CREATE INDEX idx_clients_brand_id ON clients(brand_id);
CREATE INDEX idx_clients_email ON clients(email);

-- Create projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
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

-- Create project_updates table
CREATE TABLE project_updates (
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

-- Create documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
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

-- Create messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
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

-- Create invoices table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
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
    UNIQUE (brand_id, invoice_number)
);

-- Create invoice_items table
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create client_portal_settings table
CREATE TABLE client_portal_settings (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL UNIQUE REFERENCES brands(id) ON DELETE CASCADE,
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

-- Insert payment plans
INSERT INTO payment_plans (slug, name, description, price, interval, limit_clients, limit_projects, limit_storage_gb, features, sort_order)
VALUES 
('free', 'Free', 'Perfect for trying out ClientHub', 0.00, 'month', 1, 1, 0.1, '["1 client", "1 project", "100MB storage"]'::jsonb, 1),
('starter', 'Starter', 'Great for small agencies', 29.00, 'month', 10, NULL, 5, '["10 clients", "Unlimited projects", "5GB storage"]'::jsonb, 2),
('pro', 'Pro', 'For growing agencies', 79.00, 'month', NULL, NULL, 50, '["Unlimited clients", "Unlimited projects", "50GB storage"]'::jsonb, 3);

-- Insert admin user (password: Admin123!)
INSERT INTO users (uuid, email, password_hash, full_name, role, email_verified)
VALUES (gen_random_uuid(), 'admin@faithharborclienthub.com', '$2a$10$rKZhW8qQZ9xQZ9xQZ9xQZuO', 'Admin User', 'admin', true);

-- Create profile for admin
INSERT INTO profiles (user_uuid, email, full_name, role)
SELECT uuid, email, full_name, role FROM users WHERE email = 'admin@faithharborclienthub.com';
