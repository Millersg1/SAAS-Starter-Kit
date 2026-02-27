import { query } from '../config/database.js';

/**
 * Create a new client
 */
export const createClient = async (clientData) => {
  const {
    brand_id,
    name,
    email,
    phone,
    company,
    address,
    city,
    state,
    country,
    postal_code,
    portal_access,
    status,
    client_type,
    industry,
    website,
    tax_id,
    assigned_to,
    notes,
    tags,
    custom_fields,
    created_by
  } = clientData;

  const result = await query(
    `INSERT INTO clients (
      brand_id, name, email, phone, company, address, city, state, country, 
      postal_code, portal_access, status, client_type, industry, website, 
      tax_id, assigned_to, notes, tags, custom_fields, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING id, brand_id, name, email, phone, company, address, city, state, country,
              postal_code, portal_access, status, client_type, industry, website,
              tax_id, assigned_to, notes, tags, custom_fields, created_by,
              is_active, created_at, updated_at`,
    [
      brand_id, name, email, phone, company, address, city, state, country,
      postal_code, portal_access || false, status || 'active', client_type || 'regular',
      industry, website, tax_id, assigned_to, notes, 
      JSON.stringify(tags || []), JSON.stringify(custom_fields || {}), created_by
    ]
  );

  return result.rows[0];
};

/**
 * Get all clients for a brand
 */
export const getBrandClients = async (brandId, filters = {}) => {
  const { status, client_type, assigned_to, search, limit = 50, offset = 0 } = filters;
  
  let queryText = `
    SELECT c.id, c.brand_id, c.name, c.email, c.phone, c.company,
           c.address, c.city, c.state, c.country, c.postal_code,
           c.portal_access, c.last_portal_login, c.status, c.client_type,
           c.industry, c.website, c.tax_id, c.assigned_to, c.notes,
           c.tags, c.custom_fields, c.created_by, c.is_active,
           c.created_at, c.updated_at,
           u.name as assigned_to_name, u.email as assigned_to_email
    FROM clients c
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.brand_id = $1 AND c.is_active = TRUE
  `;
  
  const params = [brandId];
  let paramCount = 1;

  if (status) {
    paramCount++;
    queryText += ` AND c.status = $${paramCount}`;
    params.push(status);
  }

  if (client_type) {
    paramCount++;
    queryText += ` AND c.client_type = $${paramCount}`;
    params.push(client_type);
  }

  if (assigned_to) {
    paramCount++;
    queryText += ` AND c.assigned_to = $${paramCount}`;
    params.push(assigned_to);
  }

  if (search) {
    paramCount++;
    queryText += ` AND (c.name ILIKE $${paramCount} OR c.email ILIKE $${paramCount} OR c.company ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  queryText += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Get client by ID
 */
export const getClientById = async (clientId) => {
  const result = await query(
    `SELECT c.id, c.brand_id, c.name, c.email, c.phone, c.company,
            c.address, c.city, c.state, c.country, c.postal_code,
            c.portal_access, c.last_portal_login, c.status, c.client_type,
            c.industry, c.website, c.tax_id, c.assigned_to, c.notes,
            c.tags, c.custom_fields, c.photo_url, c.created_by, c.is_active,
            c.created_at, c.updated_at,
            u.name as assigned_to_name, u.email as assigned_to_email,
            creator.name as created_by_name, creator.email as created_by_email
     FROM clients c
     LEFT JOIN users u ON c.assigned_to = u.id
     LEFT JOIN users creator ON c.created_by = creator.id
     WHERE c.id = $1 AND c.is_active = TRUE`,
    [clientId]
  );

  return result.rows[0];
};

/**
 * Get client by email within a brand
 */
export const getClientByEmail = async (brandId, email) => {
  const result = await query(
    `SELECT id, brand_id, name, email, phone, company, status, client_type,
            portal_access, is_active, created_at, updated_at
     FROM clients
     WHERE brand_id = $1 AND email = $2 AND is_active = TRUE`,
    [brandId, email]
  );

  return result.rows[0];
};

/**
 * Update client
 */
export const updateClient = async (clientId, updateData) => {
  const allowedFields = [
    'name', 'email', 'phone', 'company', 'address', 'city', 'state', 'country',
    'postal_code', 'portal_access', 'status', 'client_type', 'industry', 'website',
    'tax_id', 'assigned_to', 'notes', 'tags', 'custom_fields', 'photo_url',
    'lead_source', 'lead_source_detail',
    'linkedin_url', 'twitter_url', 'facebook_url', 'instagram_url',
    'company_logo_url', 'enriched_at'
  ];

  const updates = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key) && updateData[key] !== undefined) {
      updates.push(`${key} = $${paramCount}`);
      // Handle JSON fields
      if (key === 'tags' || key === 'custom_fields') {
        values.push(JSON.stringify(updateData[key]));
      } else {
        values.push(updateData[key]);
      }
      paramCount++;
    }
  });

  if (updates.length === 0) {
    return null;
  }

  values.push(clientId);

  const result = await query(
    `UPDATE clients
     SET ${updates.join(', ')}
     WHERE id = $${paramCount} AND is_active = TRUE
     RETURNING id, brand_id, name, email, phone, company, address, city, state, country,
               postal_code, portal_access, status, client_type, industry, website,
               tax_id, assigned_to, notes, tags, custom_fields, photo_url, created_by,
               is_active, created_at, updated_at`,
    values
  );

  return result.rows[0];
};

/**
 * Delete client (soft delete)
 */
export const deleteClient = async (clientId) => {
  const result = await query(
    `UPDATE clients
     SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id`,
    [clientId]
  );

  return result.rows[0];
};

/**
 * Enable portal access for client
 */
export const enablePortalAccess = async (clientId, passwordHash) => {
  const result = await query(
    `UPDATE clients
     SET portal_access = TRUE, portal_password_hash = $2
     WHERE id = $1 AND is_active = TRUE
     RETURNING id, portal_access`,
    [clientId, passwordHash]
  );

  return result.rows[0];
};

/**
 * Disable portal access for client
 */
export const disablePortalAccess = async (clientId) => {
  const result = await query(
    `UPDATE clients
     SET portal_access = FALSE, portal_password_hash = NULL
     WHERE id = $1 AND is_active = TRUE
     RETURNING id, portal_access`,
    [clientId]
  );

  return result.rows[0];
};

/**
 * Update last portal login
 */
export const updateLastPortalLogin = async (clientId) => {
  const result = await query(
    `UPDATE clients
     SET last_portal_login = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = TRUE
     RETURNING id, last_portal_login`,
    [clientId]
  );

  return result.rows[0];
};

/**
 * Get client statistics for a brand
 */
export const getClientStats = async (brandId) => {
  const result = await query(
    `SELECT 
      COUNT(*) as total_clients,
      COUNT(*) FILTER (WHERE status = 'active') as active_clients,
      COUNT(*) FILTER (WHERE status = 'inactive') as inactive_clients,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_clients,
      COUNT(*) FILTER (WHERE portal_access = TRUE) as portal_enabled,
      COUNT(*) FILTER (WHERE client_type = 'vip') as vip_clients,
      COUNT(*) FILTER (WHERE client_type = 'enterprise') as enterprise_clients
     FROM clients
     WHERE brand_id = $1 AND is_active = TRUE`,
    [brandId]
  );

  return result.rows[0];
};

/**
 * Search clients by tags
 */
export const searchClientsByTags = async (brandId, tags) => {
  const result = await query(
    `SELECT id, brand_id, name, email, company, status, client_type, tags,
            created_at, updated_at
     FROM clients
     WHERE brand_id = $1 AND is_active = TRUE AND tags ?| $2
     ORDER BY created_at DESC`,
    [brandId, tags]
  );

  return result.rows;
};

/**
 * Get clients assigned to a user
 */
export const getAssignedClients = async (userId) => {
  const result = await query(
    `SELECT c.id, c.brand_id, c.name, c.email, c.phone, c.company,
            c.status, c.client_type, c.created_at, c.updated_at,
            b.name as brand_name
     FROM clients c
     INNER JOIN brands b ON c.brand_id = b.id
     WHERE c.assigned_to = $1 AND c.is_active = TRUE AND b.is_active = TRUE
     ORDER BY c.created_at DESC`,
    [userId]
  );

  return result.rows;
};
