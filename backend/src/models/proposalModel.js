import { query } from '../config/database.js';

/**
 * Generate next proposal number for a brand (P-YYYY-NNNN format).
 */
export const generateProposalNumber = async (brandId) => {
  const year = new Date().getFullYear();
  const result = await query(
    `SELECT COUNT(*) as count FROM proposals WHERE brand_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
    [brandId, year]
  );
  const seq = parseInt(result.rows[0].count) + 1;
  return `P-${year}-${String(seq).padStart(4, '0')}`;
};

/**
 * Create a new proposal.
 */
export const createProposal = async (data) => {
  const {
    brand_id, client_id, project_id, title, issue_date, expiry_date,
    subtotal, tax_rate, tax_amount, discount_amount, total_amount,
    currency, notes, terms, created_by, proposal_number,
  } = data;

  const result = await query(
    `INSERT INTO proposals
       (brand_id, client_id, project_id, proposal_number, title, issue_date, expiry_date,
        subtotal, tax_rate, tax_amount, discount_amount, total_amount, currency,
        notes, terms, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [brand_id, client_id, project_id || null, proposal_number, title,
     issue_date || null, expiry_date || null,
     subtotal || 0, tax_rate || 0, tax_amount || 0,
     discount_amount || 0, total_amount || 0,
     currency || 'USD', notes || null, terms || null, created_by]
  );
  return result.rows[0];
};

/**
 * Get all proposals for a brand with client info.
 */
export const getBrandProposals = async (brandId, filters = {}) => {
  const { client_id, status, limit = 50, offset = 0 } = filters;
  const conditions = ['p.brand_id = $1', 'p.is_active = TRUE'];
  const params = [brandId];
  let idx = 2;

  if (client_id) { conditions.push(`p.client_id = $${idx++}`); params.push(client_id); }
  if (status)    { conditions.push(`p.status = $${idx++}`); params.push(status); }

  params.push(limit, offset);

  const result = await query(
    `SELECT p.*, c.name AS client_name, c.email AS client_email, c.company AS client_company
     FROM proposals p
     LEFT JOIN clients c ON c.id = p.client_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return result.rows;
};

/**
 * Get a single proposal by ID.
 */
export const getProposalById = async (proposalId) => {
  const result = await query(
    `SELECT p.*, c.name AS client_name, c.email AS client_email, c.company AS client_company
     FROM proposals p
     LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.id = $1 AND p.is_active = TRUE`,
    [proposalId]
  );
  return result.rows[0] || null;
};

/**
 * Get proposals for a specific client (portal use).
 */
export const getClientProposals = async (clientId) => {
  const result = await query(
    `SELECT * FROM proposals
     WHERE client_id = $1 AND status IN ('sent','accepted','rejected') AND is_active = TRUE
     ORDER BY created_at DESC`,
    [clientId]
  );
  return result.rows;
};

/**
 * Update proposal fields.
 */
export const updateProposal = async (proposalId, updates) => {
  const allowed = ['title', 'status', 'issue_date', 'expiry_date', 'subtotal',
    'tax_rate', 'tax_amount', 'discount_amount', 'total_amount', 'currency',
    'notes', 'terms', 'client_signature', 'signed_at', 'signed_by_name',
    'accepted_at', 'rejected_at', 'rejection_reason'];

  const sets = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in updates) {
      sets.push(`${key} = $${idx++}`);
      params.push(updates[key]);
    }
  }
  if (sets.length === 0) return null;

  sets.push(`updated_at = NOW()`);
  params.push(proposalId);

  const result = await query(
    `UPDATE proposals SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return result.rows[0];
};

/**
 * Soft-delete a proposal.
 */
export const deleteProposal = async (proposalId) => {
  const result = await query(
    `UPDATE proposals SET is_active = FALSE WHERE id = $1 RETURNING id`,
    [proposalId]
  );
  return result.rows.length > 0;
};

/**
 * Get all items for a proposal.
 */
export const getProposalItems = async (proposalId) => {
  const result = await query(
    `SELECT * FROM proposal_items WHERE proposal_id = $1 ORDER BY sort_order ASC`,
    [proposalId]
  );
  return result.rows;
};

/**
 * Add a line item to a proposal.
 */
export const addProposalItem = async (data) => {
  const { proposal_id, description, quantity, unit_price, sort_order } = data;
  const amount = (parseFloat(quantity) || 1) * (parseFloat(unit_price) || 0);

  const result = await query(
    `INSERT INTO proposal_items (proposal_id, description, quantity, unit_price, amount, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [proposal_id, description, quantity || 1, unit_price || 0, amount, sort_order || 0]
  );
  return result.rows[0];
};

/**
 * Update a proposal item.
 */
export const updateProposalItem = async (itemId, data) => {
  const { description, quantity, unit_price, sort_order } = data;
  const amount = (parseFloat(quantity) || 1) * (parseFloat(unit_price) || 0);

  const result = await query(
    `UPDATE proposal_items
     SET description = COALESCE($1, description),
         quantity    = COALESCE($2, quantity),
         unit_price  = COALESCE($3, unit_price),
         amount      = $4,
         sort_order  = COALESCE($5, sort_order)
     WHERE id = $6
     RETURNING *`,
    [description, quantity, unit_price, amount, sort_order, itemId]
  );
  return result.rows[0];
};

/**
 * Delete a proposal item.
 */
export const deleteProposalItem = async (itemId) => {
  const result = await query(
    `DELETE FROM proposal_items WHERE id = $1 RETURNING id`,
    [itemId]
  );
  return result.rows.length > 0;
};

/**
 * Recalculate and update proposal totals from its items.
 */
export const recalcProposalTotals = async (proposalId, taxRate = 0, discountAmount = 0) => {
  const items = await getProposalItems(proposalId);
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
  const tax_amount = subtotal * (parseFloat(taxRate) / 100);
  const total_amount = subtotal + tax_amount - parseFloat(discountAmount || 0);

  await query(
    `UPDATE proposals
     SET subtotal = $1, tax_amount = $2, total_amount = $3, updated_at = NOW()
     WHERE id = $4`,
    [subtotal, tax_amount, total_amount, proposalId]
  );
  return { subtotal, tax_amount, total_amount };
};

export const recordView = async (proposalId) => {
  const result = await query(
    `UPDATE proposals
     SET view_count = COALESCE(view_count, 0) + 1,
         first_viewed_at = COALESCE(first_viewed_at, NOW()),
         last_viewed_at = NOW()
     WHERE id = $1
     RETURNING view_count, first_viewed_at, last_viewed_at`,
    [proposalId]
  );
  return result.rows[0] || null;
};
