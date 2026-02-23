-- ============================================
-- Phase 9: Invoice Management System
-- Migration 008: Create invoices, invoice_items, and payments tables
-- ============================================

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Invoice identification
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Dates
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date DATE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    
    -- Amounts (stored in cents to avoid floating point issues)
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(12, 2) DEFAULT 0.00,
    amount_due DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Currency
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Additional info
    notes TEXT,
    terms TEXT,
    footer TEXT,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INVOICE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Item details
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(12, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    
    -- Tax
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Ordering
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    
    -- Payment details
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL, -- 'stripe', 'bank_transfer', 'check', 'cash', 'other'
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    
    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Transaction details
    transaction_id VARCHAR(255),
    payment_date TIMESTAMP,
    
    -- Additional info
    notes TEXT,
    receipt_url TEXT,
    
    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

-- Invoices indexes
CREATE INDEX idx_invoices_brand_id ON invoices(brand_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);
CREATE INDEX idx_invoices_brand_status ON invoices(brand_id, status);
CREATE INDEX idx_invoices_client_status ON invoices(client_id, status);

-- Invoice items indexes
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_sort_order ON invoice_items(invoice_id, sort_order);

-- Payments indexes
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_brand_id ON payments(brand_id);
CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update invoice updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_timestamp
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_timestamp();

-- Trigger to update invoice_items updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_item_timestamp
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_item_timestamp();

-- Trigger to update payments updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_timestamp
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_timestamp();

-- Trigger to calculate invoice item amount
CREATE OR REPLACE FUNCTION calculate_invoice_item_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate base amount
    NEW.amount = NEW.quantity * NEW.unit_price;
    
    -- Calculate tax amount if tax rate is provided
    IF NEW.tax_rate IS NOT NULL AND NEW.tax_rate > 0 THEN
        NEW.tax_amount = NEW.amount * (NEW.tax_rate / 100);
    ELSE
        NEW.tax_amount = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_invoice_item_amount
    BEFORE INSERT OR UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_item_amount();

-- Trigger to recalculate invoice totals when items change
CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_tax_amount DECIMAL(12, 2);
    v_total DECIMAL(12, 2);
    v_invoice_id UUID;
BEGIN
    -- Get the invoice_id
    IF TG_OP = 'DELETE' THEN
        v_invoice_id = OLD.invoice_id;
    ELSE
        v_invoice_id = NEW.invoice_id;
    END IF;
    
    -- Calculate subtotal and tax from all items
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_tax_amount
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;
    
    -- Update invoice with calculated values
    UPDATE invoices
    SET 
        subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_subtotal + v_tax_amount - COALESCE(discount_amount, 0),
        amount_due = v_subtotal + v_tax_amount - COALESCE(discount_amount, 0) - COALESCE(amount_paid, 0)
    WHERE id = v_invoice_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_invoice_totals_insert
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_invoice_totals();

CREATE TRIGGER trigger_recalculate_invoice_totals_update
    AFTER UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_invoice_totals();

CREATE TRIGGER trigger_recalculate_invoice_totals_delete
    AFTER DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_invoice_totals();

-- Trigger to update invoice amounts when payment is recorded
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(12, 2);
    v_invoice_total DECIMAL(12, 2);
    v_new_status VARCHAR(20);
BEGIN
    -- Calculate total paid for this invoice
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM payments
    WHERE invoice_id = NEW.invoice_id
    AND payment_status = 'completed';
    
    -- Get invoice total
    SELECT total_amount
    INTO v_invoice_total
    FROM invoices
    WHERE id = NEW.invoice_id;
    
    -- Determine new status
    IF v_total_paid >= v_invoice_total THEN
        v_new_status = 'paid';
    ELSIF v_total_paid > 0 THEN
        v_new_status = 'partial';
    ELSE
        v_new_status = 'sent';
    END IF;
    
    -- Update invoice
    UPDATE invoices
    SET 
        amount_paid = v_total_paid,
        amount_due = v_invoice_total - v_total_paid,
        status = v_new_status,
        paid_date = CASE WHEN v_new_status = 'paid' THEN CURRENT_DATE ELSE NULL END
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_payment_status
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    WHEN (NEW.payment_status = 'completed')
    EXECUTE FUNCTION update_invoice_payment_status();

-- Trigger to check for overdue invoices
CREATE OR REPLACE FUNCTION check_invoice_overdue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_date < CURRENT_DATE 
       AND NEW.status IN ('sent', 'partial') 
       AND NEW.amount_due > 0 THEN
        NEW.status = 'overdue';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_invoice_overdue
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION check_invoice_overdue();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE invoices IS 'Stores invoice information for client billing';
COMMENT ON TABLE invoice_items IS 'Stores line items for each invoice';
COMMENT ON TABLE payments IS 'Stores payment records for invoices';

COMMENT ON COLUMN invoices.invoice_number IS 'Unique invoice identifier (e.g., INV-2024-001)';
COMMENT ON COLUMN invoices.status IS 'Invoice status: draft, sent, paid, partial, overdue, cancelled';
COMMENT ON COLUMN invoices.subtotal IS 'Sum of all item amounts before tax and discount';
COMMENT ON COLUMN invoices.total_amount IS 'Final amount including tax and discount';
COMMENT ON COLUMN invoices.amount_paid IS 'Total amount paid so far';
COMMENT ON COLUMN invoices.amount_due IS 'Remaining amount to be paid';

COMMENT ON COLUMN payments.payment_method IS 'Payment method: stripe, bank_transfer, check, cash, other';
COMMENT ON COLUMN payments.payment_status IS 'Payment status: pending, completed, failed, refunded, cancelled';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe Payment Intent ID for tracking';

-- ============================================
-- INITIAL DATA
-- ============================================

-- No initial data needed for invoices

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        RAISE NOTICE 'Table invoices created successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        RAISE NOTICE 'Table invoice_items created successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        RAISE NOTICE 'Table payments created successfully';
    END IF;
END $$;
