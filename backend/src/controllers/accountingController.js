import { query } from '../config/database.js';
import * as brandModel from '../models/brandModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// ============================================
// QUICKBOOKS / XERO ACCOUNTING SYNC
// ============================================

const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;

const QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';

/**
 * Helper: verify brand membership for the current user
 */
const verifyBrandAccess = async (brandId, userId) => {
  const member = await brandModel.getBrandMember(brandId, userId);
  if (!member) {
    throw new AppError('You do not have access to this brand', 403);
  }
  return member;
};

// ============================================
// GET /:brandId/connection
// Get connected accounting service info
// ============================================
export const getConnection = catchAsync(async (req, res) => {
  const { brandId } = req.params;
  await verifyBrandAccess(brandId, req.user.id);

  const result = await query(
    `SELECT id, brand_id, provider, company_name, company_id, realm_id,
            is_active, last_sync_at, last_sync_status, last_sync_error,
            last_sync_invoice_count, last_sync_payment_count,
            token_expires_at, created_at, updated_at
     FROM accounting_connections
     WHERE brand_id = $1 AND is_active = TRUE`,
    [brandId]
  );

  res.status(200).json({
    status: 'success',
    data: { connection: result.rows[0] || null }
  });
});

// ============================================
// POST /:brandId/connect/quickbooks
// Start QuickBooks OAuth flow — returns authorization URL
// ============================================
export const connectQuickBooks = catchAsync(async (req, res) => {
  const { brandId } = req.params;
  await verifyBrandAccess(brandId, req.user.id);

  if (!QB_CLIENT_ID || !QB_CLIENT_SECRET) {
    throw new AppError('QuickBooks integration is not configured. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET.', 501);
  }

  // Check for existing active connection
  const existing = await query(
    'SELECT id FROM accounting_connections WHERE brand_id = $1 AND is_active = TRUE',
    [brandId]
  );
  if (existing.rows.length > 0) {
    throw new AppError('An accounting service is already connected. Disconnect it first.', 409);
  }

  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/accounting/callback/quickbooks`;
  const state = Buffer.from(JSON.stringify({ brandId, userId: req.user.id })).toString('base64url');
  const scope = 'com.intuit.quickbooks.accounting';

  const authUrl = `${QB_AUTH_URL}?client_id=${QB_CLIENT_ID}&response_type=code&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  res.status(200).json({
    status: 'success',
    data: { authUrl }
  });
});

// ============================================
// POST /:brandId/connect/xero
// Start Xero OAuth flow — returns authorization URL
// ============================================
export const connectXero = catchAsync(async (req, res) => {
  const { brandId } = req.params;
  await verifyBrandAccess(brandId, req.user.id);

  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET) {
    throw new AppError('Xero integration is not configured. Set XERO_CLIENT_ID and XERO_CLIENT_SECRET.', 501);
  }

  const existing = await query(
    'SELECT id FROM accounting_connections WHERE brand_id = $1 AND is_active = TRUE',
    [brandId]
  );
  if (existing.rows.length > 0) {
    throw new AppError('An accounting service is already connected. Disconnect it first.', 409);
  }

  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/accounting/callback/xero`;
  const state = Buffer.from(JSON.stringify({ brandId, userId: req.user.id })).toString('base64url');
  const scope = 'openid profile email accounting.transactions accounting.contacts offline_access';

  const authUrl = `${XERO_AUTH_URL}?client_id=${XERO_CLIENT_ID}&response_type=code&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  res.status(200).json({
    status: 'success',
    data: { authUrl }
  });
});

// ============================================
// GET /callback/quickbooks
// QuickBooks OAuth callback handler
// ============================================
export const callbackQuickBooks = catchAsync(async (req, res) => {
  const { code, state, realmId } = req.query;

  if (!code || !state) {
    throw new AppError('Invalid OAuth callback — missing code or state.', 400);
  }

  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch {
    throw new AppError('Invalid OAuth state parameter.', 400);
  }

  const { brandId, userId } = stateData;

  // TODO: Exchange authorization code for tokens using actual QuickBooks API
  // const tokenResponse = await fetch(QB_TOKEN_URL, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //     'Authorization': 'Basic ' + Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64'),
  //   },
  //   body: new URLSearchParams({
  //     grant_type: 'authorization_code',
  //     code,
  //     redirect_uri: `${process.env.BACKEND_URL}/api/accounting/callback/quickbooks`,
  //   }),
  // });
  // const tokens = await tokenResponse.json();

  // Placeholder: store connection with placeholder tokens
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600 * 1000); // 1 hour placeholder

  await query(
    `INSERT INTO accounting_connections
       (brand_id, provider, access_token, refresh_token, token_expires_at, company_name, company_id, realm_id, scope, is_active)
     VALUES ($1, 'quickbooks', $2, $3, $4, $5, $6, $7, $8, TRUE)
     ON CONFLICT (brand_id) DO UPDATE SET
       provider = 'quickbooks',
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       token_expires_at = EXCLUDED.token_expires_at,
       company_name = EXCLUDED.company_name,
       company_id = EXCLUDED.company_id,
       realm_id = EXCLUDED.realm_id,
       scope = EXCLUDED.scope,
       is_active = TRUE,
       updated_at = NOW()`,
    [
      brandId,
      `placeholder_access_token_${code}`,  // TODO: use tokens.access_token
      `placeholder_refresh_token_${code}`,  // TODO: use tokens.refresh_token
      expiresAt,
      'QuickBooks Company',                 // TODO: fetch company name from QBO API
      realmId || null,
      realmId || null,
      'com.intuit.quickbooks.accounting'
    ]
  );

  // Redirect to frontend accounting settings page
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/settings/integrations?accounting=connected&provider=quickbooks`);
});

// ============================================
// GET /callback/xero
// Xero OAuth callback handler
// ============================================
export const callbackXero = catchAsync(async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    throw new AppError('Invalid OAuth callback — missing code or state.', 400);
  }

  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch {
    throw new AppError('Invalid OAuth state parameter.', 400);
  }

  const { brandId, userId } = stateData;

  // TODO: Exchange authorization code for tokens using actual Xero API
  // const tokenResponse = await fetch(XERO_TOKEN_URL, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //     'Authorization': 'Basic ' + Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64'),
  //   },
  //   body: new URLSearchParams({
  //     grant_type: 'authorization_code',
  //     code,
  //     redirect_uri: `${process.env.BACKEND_URL}/api/accounting/callback/xero`,
  //   }),
  // });
  // const tokens = await tokenResponse.json();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1800 * 1000); // 30 min placeholder

  await query(
    `INSERT INTO accounting_connections
       (brand_id, provider, access_token, refresh_token, token_expires_at, company_name, company_id, scope, is_active)
     VALUES ($1, 'xero', $2, $3, $4, $5, $6, $7, TRUE)
     ON CONFLICT (brand_id) DO UPDATE SET
       provider = 'xero',
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       token_expires_at = EXCLUDED.token_expires_at,
       company_name = EXCLUDED.company_name,
       company_id = EXCLUDED.company_id,
       scope = EXCLUDED.scope,
       is_active = TRUE,
       updated_at = NOW()`,
    [
      brandId,
      `placeholder_access_token_${code}`,  // TODO: use tokens.access_token
      `placeholder_refresh_token_${code}`,  // TODO: use tokens.refresh_token
      expiresAt,
      'Xero Organisation',                 // TODO: fetch org name from Xero API
      null,                                 // TODO: use tokens.xero_tenant_id
      'openid profile email accounting.transactions accounting.contacts offline_access'
    ]
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/settings/integrations?accounting=connected&provider=xero`);
});

// ============================================
// DELETE /:brandId/disconnect
// Disconnect accounting integration
// ============================================
export const disconnect = catchAsync(async (req, res) => {
  const { brandId } = req.params;
  await verifyBrandAccess(brandId, req.user.id);

  const result = await query(
    `UPDATE accounting_connections
     SET is_active = FALSE, access_token = '', refresh_token = '', updated_at = NOW()
     WHERE brand_id = $1 AND is_active = TRUE
     RETURNING id, provider, company_name`,
    [brandId]
  );

  if (result.rows.length === 0) {
    throw new AppError('No active accounting connection found.', 404);
  }

  res.status(200).json({
    status: 'success',
    message: `${result.rows[0].provider} disconnected successfully.`,
    data: { disconnected: result.rows[0] }
  });
});

// ============================================
// POST /:brandId/sync
// Manual sync — push invoices + payments to accounting
// ============================================
export const syncInvoices = catchAsync(async (req, res) => {
  const { brandId } = req.params;
  await verifyBrandAccess(brandId, req.user.id);

  // Get active connection
  const connResult = await query(
    `SELECT id, provider, access_token, refresh_token, token_expires_at, realm_id, company_id
     FROM accounting_connections
     WHERE brand_id = $1 AND is_active = TRUE`,
    [brandId]
  );

  if (connResult.rows.length === 0) {
    throw new AppError('No active accounting connection. Connect QuickBooks or Xero first.', 404);
  }

  const connection = connResult.rows[0];

  // Create sync log entry
  const logResult = await query(
    `INSERT INTO accounting_sync_log (brand_id, connection_id, sync_type, status, triggered_by)
     VALUES ($1, $2, 'manual', 'started', $3)
     RETURNING id`,
    [brandId, connection.id, req.user.id]
  );
  const syncLogId = logResult.rows[0].id;

  // Fetch invoices created/updated since last sync
  const sinceDate = connection.last_sync_at || '1970-01-01';
  const invoiceResult = await query(
    `SELECT i.id, i.invoice_number, i.status, i.currency, i.issue_date, i.due_date,
            i.notes, i.created_at, i.updated_at,
            c.name AS client_name, c.email AS client_email, c.company AS client_company,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'description', ii.description,
                'quantity', ii.quantity,
                'unit_price', ii.unit_price,
                'amount', ii.amount
              ))
              FROM invoice_items ii WHERE ii.invoice_id = i.id), '[]'
            ) AS items
     FROM invoices i
     LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.brand_id = $1 AND i.updated_at > $2 AND i.status IN ('sent', 'paid', 'overdue', 'partial')
     ORDER BY i.updated_at ASC`,
    [brandId, sinceDate]
  );

  // Fetch payments since last sync
  const paymentResult = await query(
    `SELECT p.id, p.invoice_id, p.amount, p.payment_method, p.payment_date,
            p.transaction_id, p.notes, i.invoice_number
     FROM payments p
     JOIN invoices i ON i.id = p.invoice_id
     WHERE i.brand_id = $1 AND p.payment_date > $2
     ORDER BY p.payment_date ASC`,
    [brandId, sinceDate]
  );

  const invoices = invoiceResult.rows;
  const payments = paymentResult.rows;
  const errors = [];
  let invoicesSynced = 0;
  let paymentsSynced = 0;

  // TODO: Replace placeholder logic with actual QuickBooks/Xero API calls
  // For QuickBooks: use the QuickBooks Node SDK or REST API to create/update invoices
  // For Xero: use the xero-node SDK or REST API to create/update invoices
  //
  // Example QuickBooks flow:
  //   1. Check if token is expired, refresh if needed
  //   2. For each invoice, map fields to QBO Invoice object
  //   3. POST to /v3/company/{realmId}/invoice
  //   4. For each payment, map to QBO Payment object
  //   5. POST to /v3/company/{realmId}/payment
  //
  // Example Xero flow:
  //   1. Check if token is expired, refresh if needed
  //   2. For each invoice, map fields to Xero Invoice object
  //   3. PUT to /api.xro/2.0/Invoices
  //   4. For each payment, map to Xero Payment object
  //   5. PUT to /api.xro/2.0/Payments

  // Placeholder: simulate sync success for each record
  for (const invoice of invoices) {
    try {
      // TODO: Call accounting API here
      // if (connection.provider === 'quickbooks') { ... }
      // if (connection.provider === 'xero') { ... }
      invoicesSynced++;
    } catch (err) {
      errors.push({ type: 'invoice', id: invoice.id, number: invoice.invoice_number, error: err.message });
    }
  }

  for (const payment of payments) {
    try {
      // TODO: Call accounting API here
      paymentsSynced++;
    } catch (err) {
      errors.push({ type: 'payment', id: payment.id, invoiceNumber: payment.invoice_number, error: err.message });
    }
  }

  const syncStatus = errors.length === 0 ? 'success' : (invoicesSynced > 0 || paymentsSynced > 0 ? 'partial' : 'error');

  // Update sync log
  await query(
    `UPDATE accounting_sync_log
     SET status = $1, invoices_synced = $2, payments_synced = $3, errors = $4, completed_at = NOW()
     WHERE id = $5`,
    [syncStatus, invoicesSynced, paymentsSynced, JSON.stringify(errors), syncLogId]
  );

  // Update connection last sync info
  await query(
    `UPDATE accounting_connections
     SET last_sync_at = NOW(), last_sync_status = $1, last_sync_error = $2,
         last_sync_invoice_count = $3, last_sync_payment_count = $4, updated_at = NOW()
     WHERE id = $5`,
    [
      syncStatus,
      errors.length > 0 ? JSON.stringify(errors) : null,
      invoicesSynced,
      paymentsSynced,
      connection.id
    ]
  );

  res.status(200).json({
    status: 'success',
    data: {
      sync: {
        status: syncStatus,
        invoices_synced: invoicesSynced,
        payments_synced: paymentsSynced,
        invoices_found: invoices.length,
        payments_found: payments.length,
        errors: errors.length > 0 ? errors : undefined,
        sync_log_id: syncLogId
      }
    }
  });
});

// ============================================
// GET /:brandId/sync-status
// Get last sync status and recent sync history
// ============================================
export const getSyncStatus = catchAsync(async (req, res) => {
  const { brandId } = req.params;
  await verifyBrandAccess(brandId, req.user.id);

  // Get connection sync summary
  const connResult = await query(
    `SELECT id, provider, company_name, is_active, last_sync_at, last_sync_status,
            last_sync_error, last_sync_invoice_count, last_sync_payment_count
     FROM accounting_connections
     WHERE brand_id = $1 AND is_active = TRUE`,
    [brandId]
  );

  if (connResult.rows.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: { connection: null, history: [] }
    });
  }

  const connection = connResult.rows[0];

  // Get recent sync history (last 20 entries)
  const historyResult = await query(
    `SELECT id, sync_type, status, invoices_synced, payments_synced, errors,
            started_at, completed_at, triggered_by
     FROM accounting_sync_log
     WHERE connection_id = $1
     ORDER BY started_at DESC
     LIMIT 20`,
    [connection.id]
  );

  res.status(200).json({
    status: 'success',
    data: {
      connection: {
        id: connection.id,
        provider: connection.provider,
        company_name: connection.company_name,
        is_active: connection.is_active,
        last_sync_at: connection.last_sync_at,
        last_sync_status: connection.last_sync_status,
        last_sync_error: connection.last_sync_error,
        last_sync_invoice_count: connection.last_sync_invoice_count,
        last_sync_payment_count: connection.last_sync_payment_count
      },
      history: historyResult.rows
    }
  });
});
