import { query } from '../config/database.js';

// ── Endpoints ──────────────────────────────────────────────────────────────

export const getEndpointsByBrand = async (brandId) => {
  const result = await query(
    `SELECT id, brand_id, url, description, events, is_active, created_at, updated_at
     FROM webhook_endpoints WHERE brand_id = $1 ORDER BY created_at DESC`,
    [brandId]
  );
  return result.rows;
};

export const getEndpointById = async (id) => {
  const result = await query(
    `SELECT * FROM webhook_endpoints WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const createEndpoint = async ({ brand_id, url, description, events }) => {
  const result = await query(
    `INSERT INTO webhook_endpoints (brand_id, url, description, events)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [brand_id, url, description || null, events || []]
  );
  return result.rows[0];
};

export const updateEndpoint = async (id, { url, description, events, is_active }) => {
  const result = await query(
    `UPDATE webhook_endpoints
     SET url         = COALESCE($1, url),
         description = COALESCE($2, description),
         events      = COALESCE($3, events),
         is_active   = COALESCE($4, is_active),
         updated_at  = NOW()
     WHERE id = $5
     RETURNING *`,
    [url || null, description !== undefined ? description : null, events || null, is_active !== undefined ? is_active : null, id]
  );
  return result.rows[0];
};

export const deleteEndpoint = async (id) => {
  await query(`DELETE FROM webhook_endpoints WHERE id = $1`, [id]);
};

// ── Deliveries ─────────────────────────────────────────────────────────────

export const createDelivery = async ({ endpoint_id, event_type, payload }) => {
  const result = await query(
    `INSERT INTO webhook_deliveries (endpoint_id, event_type, payload)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [endpoint_id, event_type, JSON.stringify(payload)]
  );
  return result.rows[0];
};

export const updateDelivery = async (id, { status, response_status, response_body, attempts, delivered_at }) => {
  await query(
    `UPDATE webhook_deliveries
     SET status          = COALESCE($1, status),
         response_status = COALESCE($2, response_status),
         response_body   = COALESCE($3, response_body),
         attempts        = COALESCE($4, attempts),
         delivered_at    = COALESCE($5, delivered_at)
     WHERE id = $6`,
    [status, response_status || null, response_body || null, attempts || null, delivered_at || null, id]
  );
};

export const getDeliveriesByEndpoint = async (endpointId, limit = 20) => {
  const result = await query(
    `SELECT id, event_type, status, response_status, attempts, delivered_at, created_at
     FROM webhook_deliveries
     WHERE endpoint_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [endpointId, limit]
  );
  return result.rows;
};
