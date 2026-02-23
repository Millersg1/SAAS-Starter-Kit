import { query } from '../config/database.js';

// ============================================
// INVOICE CRUD OPERATIONS
// ============================================

/**
 * Create a new invoice
 */
export const createInvoice = async (invoiceData) => {
  const result = await query(
    `INSERT INTO invoices (
      brand_id, client_id, project_id, invoice_number,
      issue_date, due_date, status, currency, notes, terms, footer, created_by,
      recurrence_type, recurrence_day, next_invoice_date, parent_invoice_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      invoiceData.brand_id,
      invoiceData.client_id,
      invoiceData.project_id,
      invoiceData.invoice_number,
      invoiceData.issue_date,
      invoiceData.due_date,
      invoiceData.status || 'draft',
      invoiceData.currency || 'USD',
      invoiceData.notes,
      invoiceData.terms,
      invoiceData.footer,
      invoiceData.created_by,
      invoiceData.recurrence_type || 'none',
      invoiceData.recurrence_day || null,
      invoiceData.next_invoice_date || null,
      invoiceData.parent_invoice_id || null,
    ]
  );
  return result.rows[0];
};

/**
 * Get all invoices for a brand with filters
 */
export const getBrandInvoices = async (brandId, filters = {}) => {
  let queryText = `
    SELECT i.*, 
           c.name as client_name, c.email as client_email,
           p.name as project_name,
           u.name as created_by_name
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    LEFT JOIN projects p ON i.project_id = p.id
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.brand_id = $1
      AND (i.status != 'cancelled' OR $2 = TRUE)
  `;

  const params = [brandId, filters.include_cancelled === true];
  let paramCount = 2;

  // Add filters
  if (filters.client_id) {
    paramCount++;
    queryText += ` AND i.client_id = $${paramCount}`;
    params.push(filters.client_id);
  }

  if (filters.project_id) {
    paramCount++;
    queryText += ` AND i.project_id = $${paramCount}`;
    params.push(filters.project_id);
  }

  if (filters.status) {
    paramCount++;
    queryText += ` AND i.status = $${paramCount}`;
    params.push(filters.status);
  }

  if (filters.search) {
    paramCount++;
    queryText += ` AND (i.invoice_number ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`;
    params.push(`%${filters.search}%`);
  }

  // Add ordering
  queryText += ` ORDER BY i.created_at DESC`;

  // Add pagination
  if (filters.limit) {
    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
  }

  if (filters.offset) {
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(filters.offset);
  }

  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Get invoice by ID
 */
export const getInvoiceById = async (invoiceId) => {
  const result = await query(
    `SELECT i.*, 
            c.name as client_name, c.email as client_email, c.company as client_company,
            c.address as client_address, c.phone as client_phone,
            p.name as project_name,
            u.name as created_by_name, u.email as created_by_email
     FROM invoices i
     LEFT JOIN clients c ON i.client_id = c.id
     LEFT JOIN projects p ON i.project_id = p.id
     LEFT JOIN users u ON i.created_by = u.id
     WHERE i.id = $1`,
    [invoiceId]
  );
  return result.rows[0];
};

/**
 * Update invoice
 */
export const updateInvoice = async (invoiceId, updates) => {
  const allowedFields = [
    'client_id', 'project_id', 'invoice_number', 'issue_date', 'due_date',
    'status', 'tax_rate', 'discount_amount', 'currency', 'notes', 'terms', 'footer',
    'recurrence_type', 'recurrence_day', 'next_invoice_date', 'parent_invoice_id',
  ];
  
  const setClause = [];
  const values = [];
  let paramCount = 0;

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key) && updates[key] !== undefined) {
      paramCount++;
      setClause.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
    }
  });

  if (setClause.length === 0) {
    return getInvoiceById(invoiceId);
  }

  paramCount++;
  values.push(invoiceId);

  const result = await query(
    `UPDATE invoices 
     SET ${setClause.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );
  
  return result.rows[0];
};

/**
 * Delete invoice (soft delete by setting status to cancelled)
 */
export const deleteInvoice = async (invoiceId) => {
  await query(
    `UPDATE invoices SET status = 'cancelled' WHERE id = $1`,
    [invoiceId]
  );
};

/**
 * Generate next invoice number for a brand
 */
export const generateInvoiceNumber = async (brandId) => {
  const result = await query(
    `SELECT invoice_number 
     FROM invoices 
     WHERE brand_id = $1 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [brandId]
  );

  if (result.rows.length === 0) {
    const year = new Date().getFullYear();
    return `INV-${year}-001`;
  }

  const lastNumber = result.rows[0].invoice_number;
  const match = lastNumber.match(/INV-(\d{4})-(\d{3})/);
  
  if (match) {
    const year = new Date().getFullYear();
    const lastYear = parseInt(match[1]);
    const lastSeq = parseInt(match[2]);
    
    if (year === lastYear) {
      const newSeq = (lastSeq + 1).toString().padStart(3, '0');
      return `INV-${year}-${newSeq}`;
    } else {
      return `INV-${year}-001`;
    }
  }
  
  const year = new Date().getFullYear();
  return `INV-${year}-001`;
};

// ============================================
// INVOICE ITEMS
// ============================================

/**
 * Add item to invoice
 */
export const addInvoiceItem = async (itemData) => {
  const result = await query(
    `INSERT INTO invoice_items (
      invoice_id, description, quantity, unit_price, tax_rate, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      itemData.invoice_id,
      itemData.description,
      itemData.quantity,
      itemData.unit_price,
      itemData.tax_rate || 0,
      itemData.sort_order || 0
    ]
  );
  return result.rows[0];
};

/**
 * Get all items for an invoice
 */
export const getInvoiceItems = async (invoiceId) => {
  const result = await query(
    `SELECT * FROM invoice_items 
     WHERE invoice_id = $1 
     ORDER BY sort_order, created_at`,
    [invoiceId]
  );
  return result.rows;
};

/**
 * Update invoice item
 */
export const updateInvoiceItem = async (itemId, updates) => {
  const allowedFields = ['description', 'quantity', 'unit_price', 'tax_rate', 'sort_order'];
  
  const setClause = [];
  const values = [];
  let paramCount = 0;

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key) && updates[key] !== undefined) {
      paramCount++;
      setClause.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
    }
  });

  if (setClause.length === 0) {
    return null;
  }

  paramCount++;
  values.push(itemId);

  const result = await query(
    `UPDATE invoice_items 
     SET ${setClause.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );
  
  return result.rows[0];
};

/**
 * Delete invoice item
 */
export const deleteInvoiceItem = async (itemId) => {
  await query(`DELETE FROM invoice_items WHERE id = $1`, [itemId]);
};

// ============================================
// PAYMENTS
// ============================================

/**
 * Record a payment
 */
export const recordPayment = async (paymentData) => {
  const result = await query(
    `INSERT INTO payments (
      invoice_id, brand_id, client_id, amount, currency,
      payment_method, payment_status, stripe_payment_intent_id,
      stripe_charge_id, stripe_customer_id, transaction_id,
      payment_date, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      paymentData.invoice_id,
      paymentData.brand_id,
      paymentData.client_id,
      paymentData.amount,
      paymentData.currency || 'USD',
      paymentData.payment_method,
      paymentData.payment_status || 'pending',
      paymentData.stripe_payment_intent_id,
      paymentData.stripe_charge_id,
      paymentData.stripe_customer_id,
      paymentData.transaction_id,
      paymentData.payment_date || new Date(),
      paymentData.notes,
      paymentData.created_by
    ]
  );
  return result.rows[0];
};

/**
 * Get payment history for an invoice
 */
export const getInvoicePayments = async (invoiceId) => {
  const result = await query(
    `SELECT p.*, u.name as created_by_name
     FROM payments p
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.invoice_id = $1
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    [invoiceId]
  );
  return result.rows;
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (paymentId) => {
  const result = await query(
    `SELECT * FROM payments WHERE id = $1`,
    [paymentId]
  );
  return result.rows[0];
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (paymentId, status, updates = {}) => {
  const result = await query(
    `UPDATE payments 
     SET payment_status = $1,
         stripe_charge_id = COALESCE($2, stripe_charge_id),
         receipt_url = COALESCE($3, receipt_url),
         notes = COALESCE($4, notes)
     WHERE id = $5
     RETURNING *`,
    [status, updates.stripe_charge_id, updates.receipt_url, updates.notes, paymentId]
  );
  return result.rows[0];
};

/**
 * Get payment by Stripe Payment Intent ID
 */
export const getPaymentByStripeIntent = async (paymentIntentId) => {
  const result = await query(
    `SELECT * FROM payments WHERE stripe_payment_intent_id = $1`,
    [paymentIntentId]
  );
  return result.rows[0];
};

// ============================================
// STATISTICS & REPORTS
// ============================================

/**
 * Get invoice statistics for a brand
 */
export const getInvoiceStats = async (brandId) => {
  const result = await query(
    `SELECT 
      COUNT(*) as total_invoices,
      COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
      COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
      COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
      COUNT(*) FILTER (WHERE status = 'partial') as partial_count,
      COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
      COALESCE(SUM(total_amount), 0) as total_billed,
      COALESCE(SUM(amount_paid), 0) as total_paid,
      COALESCE(SUM(amount_due), 0) as total_outstanding
     FROM invoices
     WHERE brand_id = $1 AND status != 'cancelled'`,
    [brandId]
  );
  return result.rows[0];
};

/**
 * Get overdue invoices
 */
export const getOverdueInvoices = async (brandId) => {
  const result = await query(
    `SELECT i.*, 
            c.name as client_name, c.email as client_email
     FROM invoices i
     LEFT JOIN clients c ON i.client_id = c.id
     WHERE i.brand_id = $1 
       AND i.status IN ('sent', 'partial', 'overdue')
       AND i.due_date < CURRENT_DATE
       AND i.amount_due > 0
     ORDER BY i.due_date ASC`,
    [brandId]
  );
  return result.rows;
};

/**
 * Get recent invoices
 */
export const getRecentInvoices = async (brandId, limit = 10) => {
  const result = await query(
    `SELECT i.*, 
            c.name as client_name
     FROM invoices i
     LEFT JOIN clients c ON i.client_id = c.id
     WHERE i.brand_id = $1
     ORDER BY i.created_at DESC
     LIMIT $2`,
    [brandId, limit]
  );
  return result.rows;
};

/**
 * Get client invoice history
 */
export const getClientInvoices = async (clientId) => {
  const result = await query(
    `SELECT * FROM invoices 
     WHERE client_id = $1 
     ORDER BY created_at DESC`,
    [clientId]
  );
  return result.rows;
};

/**
 * Get project invoices
 */
export const getProjectInvoices = async (projectId) => {
  const result = await query(
    `SELECT * FROM invoices
     WHERE project_id = $1
     ORDER BY created_at DESC`,
    [projectId]
  );
  return result.rows;
};

/**
 * Get all recurring invoices whose next_invoice_date is today or in the past
 */
export const getDueRecurringInvoices = async () => {
  const result = await query(
    `SELECT * FROM invoices
     WHERE recurrence_type != 'none'
       AND next_invoice_date <= CURRENT_DATE
       AND status != 'cancelled'`,
    []
  );
  return result.rows;
};
