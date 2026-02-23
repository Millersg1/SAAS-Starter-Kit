-- ===========================================
-- ClientHub - Database Schema Extension
-- ===========================================
-- Run this AFTER the main schema.sql
-- Adds client portal functionality to SAAS Starter Kit
-- ===========================================

-- ===========================================
-- CLIENTS TABLE
-- ===========================================
-- Stores client information for each agency/brand

CREATE TABLE IF NOT EXISTS public.clients (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    brand_id INT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    
    -- Client Information
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    
    -- Status & Metadata
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    -- Portal Access
    portal_access BOOLEAN DEFAULT true,
    portal_password_hash TEXT, -- For client portal login
    last_login_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique email per brand
    CONSTRAINT clients_brand_email_unique UNIQUE (brand_id, email)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_clients_brand_id ON public.clients(brand_id);
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_public_id ON public.clients(public_id);
CREATE INDEX idx_clients_tags ON public.clients USING GIN(tags);

COMMENT ON TABLE public.clients IS 'Client companies managed by agencies';
COMMENT ON COLUMN public.clients.portal_access IS 'Whether client can access the portal';
COMMENT ON COLUMN public.clients.portal_password_hash IS 'Hashed password for client portal login';

-- ===========================================
-- PROJECTS TABLE
-- ===========================================
-- Projects/engagements for clients

CREATE TABLE IF NOT EXISTS public.projects (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    brand_id INT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    client_id INT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    
    -- Project Information
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Timeline
    start_date DATE,
    end_date DATE,
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    
    -- Budget
    budget_amount DECIMAL(10, 2),
    currency TEXT DEFAULT 'USD',
    
    -- Progress
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    color TEXT, -- For visual identification
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_projects_brand_id ON public.projects(brand_id);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_public_id ON public.projects(public_id);
CREATE INDEX idx_projects_dates ON public.projects(start_date, end_date);

COMMENT ON TABLE public.projects IS 'Client projects and engagements';

-- ===========================================
-- PROJECT UPDATES TABLE
-- ===========================================
-- Status updates and milestones for projects

CREATE TABLE IF NOT EXISTS public.project_updates (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Update Information
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    update_type TEXT NOT NULL DEFAULT 'general' CHECK (update_type IN ('general', 'milestone', 'issue', 'completion')),
    
    -- Visibility
    visible_to_client BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_project_updates_project_id ON public.project_updates(project_id);
CREATE INDEX idx_project_updates_user_id ON public.project_updates(user_id);
CREATE INDEX idx_project_updates_type ON public.project_updates(update_type);
CREATE INDEX idx_project_updates_visible ON public.project_updates(visible_to_client);

COMMENT ON TABLE public.project_updates IS 'Project status updates and milestones';

-- ===========================================
-- DOCUMENTS TABLE
-- ===========================================
-- Files and documents shared with clients

CREATE TABLE IF NOT EXISTS public.documents (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    brand_id INT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    client_id INT REFERENCES public.clients(id) ON DELETE CASCADE,
    project_id INT REFERENCES public.projects(id) ON DELETE SET NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- File Information
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    file_size BIGINT NOT NULL, -- Size in bytes
    file_type TEXT NOT NULL, -- MIME type
    
    -- Organization
    folder TEXT DEFAULT '/', -- Virtual folder path
    tags TEXT[] DEFAULT '{}',
    
    -- Access Control
    is_public BOOLEAN DEFAULT false, -- Public to all brand members
    shared_with_client BOOLEAN DEFAULT false,
    
    -- Tracking
    download_count INT DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,
    
    -- Expiration (optional)
    expires_at TIMESTAMPTZ,
    
    -- Version Control
    version INT DEFAULT 1,
    previous_version_id INT REFERENCES public.documents(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_documents_brand_id ON public.documents(brand_id);
CREATE INDEX idx_documents_client_id ON public.documents(client_id);
CREATE INDEX idx_documents_project_id ON public.documents(project_id);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_documents_public_id ON public.documents(public_id);
CREATE INDEX idx_documents_folder ON public.documents(folder);
CREATE INDEX idx_documents_tags ON public.documents USING GIN(tags);
CREATE INDEX idx_documents_expires ON public.documents(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE public.documents IS 'Files and documents shared with clients';
COMMENT ON COLUMN public.documents.file_path IS 'Path in Supabase Storage bucket';

-- ===========================================
-- MESSAGES TABLE
-- ===========================================
-- Communication between agency and clients

CREATE TABLE IF NOT EXISTS public.messages (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    brand_id INT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    client_id INT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    project_id INT REFERENCES public.projects(id) ON DELETE SET NULL,
    
    -- Message Information
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Sender (either agency user or client)
    sender_type TEXT NOT NULL CHECK (sender_type IN ('agency', 'client')),
    sender_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- If agency
    sender_client_id INT REFERENCES public.clients(id) ON DELETE SET NULL, -- If client
    
    -- Thread
    parent_message_id INT REFERENCES public.messages(id) ON DELETE CASCADE,
    thread_id INT, -- Root message ID for threading
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Attachments
    has_attachments BOOLEAN DEFAULT false,
    attachment_ids INT[] DEFAULT '{}', -- References to documents table
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_brand_id ON public.messages(brand_id);
CREATE INDEX idx_messages_client_id ON public.messages(client_id);
CREATE INDEX idx_messages_project_id ON public.messages(project_id);
CREATE INDEX idx_messages_sender_user ON public.messages(sender_user_id);
CREATE INDEX idx_messages_sender_client ON public.messages(sender_client_id);
CREATE INDEX idx_messages_thread ON public.messages(thread_id);
CREATE INDEX idx_messages_parent ON public.messages(parent_message_id);
CREATE INDEX idx_messages_public_id ON public.messages(public_id);
CREATE INDEX idx_messages_unread ON public.messages(is_read) WHERE is_read = false;

COMMENT ON TABLE public.messages IS 'Messages between agencies and clients';

-- ===========================================
-- INVOICES TABLE
-- ===========================================
-- Invoices sent to clients

CREATE TABLE IF NOT EXISTS public.invoices (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    brand_id INT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    client_id INT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    project_id INT REFERENCES public.projects(id) ON DELETE SET NULL,
    
    -- Invoice Information
    invoice_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    
    -- Amounts
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    
    -- Dates
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date DATE,
    
    -- Payment
    payment_method TEXT, -- 'stripe', 'bank_transfer', 'check', 'cash', 'other'
    stripe_invoice_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- Notes
    notes TEXT,
    terms TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    
    -- Ensure unique invoice number per brand
    CONSTRAINT invoices_brand_number_unique UNIQUE (brand_id, invoice_number)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoices_brand_id ON public.invoices(brand_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_public_id ON public.invoices(public_id);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_stripe ON public.invoices(stripe_invoice_id);

COMMENT ON TABLE public.invoices IS 'Invoices sent to clients';

-- ===========================================
-- INVOICE LINE ITEMS TABLE
-- ===========================================
-- Individual items on an invoice

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    
    -- Item Information
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL, -- quantity * unit_price
    
    -- Order
    sort_order INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_sort ON public.invoice_items(sort_order);

COMMENT ON TABLE public.invoice_items IS 'Line items for invoices';

-- ===========================================
-- CLIENT PORTAL SETTINGS TABLE
-- ===========================================
-- White-label branding settings per agency

CREATE TABLE IF NOT EXISTS public.client_portal_settings (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE UNIQUE,
    
    -- Branding
    logo_url TEXT,
    primary_color TEXT DEFAULT '#667eea',
    secondary_color TEXT DEFAULT '#764ba2',
    
    -- Domain
    custom_domain TEXT,
    subdomain TEXT, -- e.g., 'acme' for acme.clienthub.com
    
    -- Content
    welcome_message TEXT,
    footer_text TEXT,
    
    -- Features
    show_powered_by BOOLEAN DEFAULT true, -- "Powered by ClientHub"
    enable_messaging BOOLEAN DEFAULT true,
    enable_document_downloads BOOLEAN DEFAULT true,
    enable_invoice_payments BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_portal_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_portal_settings_brand_id ON public.client_portal_settings(brand_id);
CREATE INDEX idx_portal_settings_subdomain ON public.client_portal_settings(subdomain);
CREATE INDEX idx_portal_settings_domain ON public.client_portal_settings(custom_domain);

COMMENT ON TABLE public.client_portal_settings IS 'White-label branding for client portals';

-- ===========================================
-- UPDATE PAYMENT PLANS
-- ===========================================
-- Add client and project limits

ALTER TABLE public.payment_plans 
ADD COLUMN IF NOT EXISTS limit_clients INTEGER,
ADD COLUMN IF NOT EXISTS limit_projects INTEGER,
ADD COLUMN IF NOT EXISTS limit_storage_gb DECIMAL(10, 2);

-- Update existing plans with ClientHub limits
UPDATE public.payment_plans SET 
    limit_clients = 1,
    limit_projects = 1,
    limit_storage_gb = 0.1,
    features = '["1 client", "1 project", "100MB storage", "Basic branding", "Email support"]'::jsonb
WHERE slug = 'free';

UPDATE public.payment_plans SET 
    limit_clients = 10,
    limit_projects = NULL, -- Unlimited
    limit_storage_gb = 5,
    features = '["10 clients", "Unlimited projects", "5GB storage", "Custom branding", "Remove powered by", "Priority email support"]'::jsonb
WHERE slug = 'starter';

UPDATE public.payment_plans SET 
    limit_clients = NULL, -- Unlimited
    limit_projects = NULL, -- Unlimited
    limit_storage_gb = 50,
    features = '["Unlimited clients", "Unlimited projects", "50GB storage", "Custom domain", "White-label branding", "API access", "Priority support", "Advanced analytics"]'::jsonb
WHERE slug = 'pro';

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Function: Check if user can access client
CREATE OR REPLACE FUNCTION public.can_access_client(p_user_id UUID, p_client_id INT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.clients c
        JOIN public.brand_members bm ON bm.brand_id = c.brand_id
        WHERE c.id = p_client_id AND bm.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if brand can add more clients
CREATE OR REPLACE FUNCTION public.can_add_client(p_brand_id INT)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    client_limit INTEGER;
    brand_plan TEXT;
BEGIN
    -- Get current client count
    SELECT COUNT(*) INTO current_count
    FROM public.clients
    WHERE brand_id = p_brand_id AND status != 'archived';
    
    -- Get brand's plan
    SELECT COALESCE(s.plan, 'free') INTO brand_plan
    FROM public.subscriptions s
    WHERE s.brand_id = p_brand_id;
    
    IF brand_plan IS NULL THEN
        brand_plan := 'free';
    END IF;
    
    -- Get client limit for plan
    SELECT limit_clients INTO client_limit
    FROM public.payment_plans
    WHERE slug = brand_plan;
    
    -- NULL means unlimited
    IF client_limit IS NULL THEN
        RETURN true;
    END IF;
    
    RETURN current_count < client_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get brand storage usage in GB
CREATE OR REPLACE FUNCTION public.get_storage_usage_gb(p_brand_id INT)
RETURNS DECIMAL AS $$
DECLARE
    total_bytes BIGINT;
BEGIN
    SELECT COALESCE(SUM(file_size), 0) INTO total_bytes
    FROM public.documents
    WHERE brand_id = p_brand_id;
    
    -- Convert bytes to GB
    RETURN (total_bytes::DECIMAL / 1073741824)::DECIMAL(10, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if brand can upload file
CREATE OR REPLACE FUNCTION public.can_upload_file(p_brand_id INT, p_file_size_bytes BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage_gb DECIMAL;
    storage_limit_gb DECIMAL;
    brand_plan TEXT;
    new_usage_gb DECIMAL;
BEGIN
    -- Get current usage
    current_usage_gb := public.get_storage_usage_gb(p_brand_id);
    
    -- Get brand's plan
    SELECT COALESCE(s.plan, 'free') INTO brand_plan
    FROM public.subscriptions s
    WHERE s.brand_id = p_brand_id;
    
    IF brand_plan IS NULL THEN
        brand_plan := 'free';
    END IF;
    
    -- Get storage limit for plan
    SELECT limit_storage_gb INTO storage_limit_gb
    FROM public.payment_plans
    WHERE slug = brand_plan;
    
    -- NULL means unlimited
    IF storage_limit_gb IS NULL THEN
        RETURN true;
    END IF;
    
    -- Calculate new usage
    new_usage_gb := current_usage_gb + (p_file_size_bytes::DECIMAL / 1073741824);
    
    RETURN new_usage_gb <= storage_limit_gb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate next invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_brand_id INT)
RETURNS TEXT AS $$
DECLARE
    next_number INT;
    year_prefix TEXT;
BEGIN
    -- Get current year
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get next number for this year
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number LIKE year_prefix || '-%'
            THEN CAST(SUBSTRING(invoice_number FROM LENGTH(year_prefix) + 2) AS INT)
            ELSE 0
        END
    ), 0) + 1 INTO next_number
    FROM public.invoices
    WHERE brand_id = p_brand_id;
    
    -- Format: YYYY-0001, YYYY-0002, etc.
    RETURN year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_updates_updated_at
    BEFORE UPDATE ON public.project_updates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portal_settings_updated_at
    BEFORE UPDATE ON public.client_portal_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- RLS POLICIES: CLIENTS
-- ===========================================

-- Brand members can view their brand's clients
CREATE POLICY "Brand members can view clients"
    ON public.clients FOR SELECT
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

-- Brand admins can create clients (with limit check)
CREATE POLICY "Brand admins can create clients"
    ON public.clients FOR INSERT
    WITH CHECK (
        public.is_brand_admin(auth.uid(), brand_id)
        AND public.can_add_client(brand_id)
    );

-- Brand admins can update their brand's clients
CREATE POLICY "Brand admins can update clients"
    ON public.clients FOR UPDATE
    USING (
        public.is_brand_admin(auth.uid(), brand_id)
    );

-- Brand admins can delete their brand's clients
CREATE POLICY "Brand admins can delete clients"
    ON public.clients FOR DELETE
    USING (
        public.is_brand_admin(auth.uid(), brand_id)
    );

-- System admins can do everything
CREATE POLICY "Admins can manage all clients"
    ON public.clients FOR ALL
    USING (public.is_admin(auth.uid()));

-- ===========================================
-- RLS POLICIES: PROJECTS
-- ===========================================

CREATE POLICY "Brand members can view projects"
    ON public.projects FOR SELECT
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Brand members can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Brand members can update projects"
    ON public.projects FOR UPDATE
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Brand admins can delete projects"
    ON public.projects FOR DELETE
    USING (
        public.is_brand_admin(auth.uid(), brand_id)
    );

CREATE POLICY "Admins can manage all projects"
    ON public.projects FOR ALL
    USING (public.is_admin(auth.uid()));

-- ===========================================
-- RLS POLICIES: PROJECT UPDATES
-- ===========================================

CREATE POLICY "Brand members can view project updates"
    ON public.project_updates FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.projects p
            WHERE p.brand_id IN (
                SELECT brand_id FROM public.brand_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Brand members can create project updates"
    ON public.project_updates FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND project_id IN (
            SELECT id FROM public.projects p
            WHERE p.brand_id IN (
                SELECT brand_id FROM public.brand_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update own project updates"
    ON public.project_updates FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own project updates"
    ON public.project_updates FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all project updates"
    ON public.project_updates FOR ALL
    USING (public.is_admin(auth.uid()));

-- ===========================================
-- RLS POLICIES: DOCUMENTS
-- ===========================================

CREATE POLICY "Brand members can view documents"
    ON public.documents FOR SELECT
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Brand members can upload documents"
    ON public.documents FOR INSERT
    WITH CHECK (
        uploaded_by = auth.uid()
        AND brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
        AND public.can_upload_file(brand_id, file_size)
    );

CREATE POLICY "Uploaders can update own documents"
    ON public.documents FOR UPDATE
    USING (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can delete own documents"
    ON public.documents FOR DELETE
    USING (uploaded_by = auth.uid());

CREATE POLICY "Brand admins can manage all brand documents"
    ON public.documents FOR ALL
    USING (
        public.is_brand_admin(auth.uid(), brand_id)
    );

CREATE POLICY "Admins can manage all documents"
    ON public.documents FOR ALL
    USING (public.is_admin(auth.uid()));

-- ===========================================
-- RLS POLICIES: MESSAGES
-- ===========================================

CREATE POLICY "Brand members can view messages"
    ON public.messages FOR SELECT
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Brand members can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_type = 'agency'
        AND sender_user_id = auth.uid()
        AND brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Senders can update own messages"
    ON public.messages FOR UPDATE
    USING (sender_user_id = auth.uid());

CREATE POLICY "Admins can manage all messages"
    ON public.messages FOR ALL
    USING (public.is_admin(auth.uid()));

-- ===========================================
-- RLS POLICIES: INVOICES
-- ===========================================

CREATE POLICY "Brand members can view invoices"
    ON public.invoices FOR SELECT
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Brand members can create invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Brand members can update invoices"
    ON public.invoices FOR UPDATE
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Brand admins can delete invoices"
    ON public.invoices FOR DELETE
    USING (
        public.is_brand_admin(auth.uid(), brand_id)
    );

CREATE POLICY "Admins can manage all invoices"
    ON public.invoices FOR ALL
    USING (public.is_admin(auth.uid()));

-- Service role for Stripe webhooks
CREATE POLICY "Service role can manage invoices"
    ON public.invoices FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ===========================================
-- RLS POLICIES: INVOICE ITEMS
-- ===========================================

CREATE POLICY "Brand members can view invoice items"
    ON public.invoice_items FOR SELECT
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices i
            WHERE i.brand_id IN (
                SELECT brand_id FROM public.brand_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Brand members can manage invoice items"
    ON public.invoice_items FOR ALL
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices i
            WHERE i.brand_id IN (
                SELECT brand_id FROM public.brand_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can manage all invoice items"
    ON public.invoice_items FOR ALL
    USING (public.is_admin(auth.uid()));

-- ===========================================
-- RLS POLICIES: CLIENT PORTAL SETTINGS
-- ===========================================

CREATE POLICY "Brand members can view portal settings"
    ON public.client_portal_settings FOR SELECT
    USING (
        brand_id IN (
            SELECT brand_id FROM public.brand_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Brand admins can manage portal settings"
    ON public.client_portal_settings FOR ALL
    USING (
        public.is_brand_admin(auth.uid(), brand_id)
    );

CREATE POLICY "Admins can manage all portal settings"
    ON public.client_portal_settings FOR ALL
    USING (public.is_admin(auth.uid()));

-- ===========================================
-- STORAGE BUCKETS
-- ===========================================

-- Client documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Brand members can view documents
CREATE POLICY "Brand members can view client documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'client-documents' AND
        (storage.foldername(name))[1]::int IN (
            SELECT brand_
