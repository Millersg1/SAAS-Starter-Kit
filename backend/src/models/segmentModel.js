import { query } from '../config/database.js';

// ============================================
// SEGMENT CRUD
// ============================================

export const getSegments = async (brandId) => {
  const res = await query(
    `SELECT * FROM client_segments WHERE brand_id = $1 AND is_active = TRUE ORDER BY created_at ASC`,
    [brandId]
  );
  return res.rows;
};

export const createSegment = async (data) => {
  const { brand_id, name, description, filter_config } = data;
  const res = await query(
    `INSERT INTO client_segments (brand_id, name, description, filter_config)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [brand_id, name, description || null, JSON.stringify(filter_config || [])]
  );
  return res.rows[0];
};

export const updateSegment = async (id, data) => {
  const { name, description, filter_config, client_count } = data;
  const sets = [];
  const params = [];
  let idx = 1;
  if (name !== undefined)         { sets.push(`name = $${idx++}`);          params.push(name); }
  if (description !== undefined)  { sets.push(`description = $${idx++}`);   params.push(description); }
  if (filter_config !== undefined){ sets.push(`filter_config = $${idx++}`); params.push(JSON.stringify(filter_config)); }
  if (client_count !== undefined) {
    sets.push(`client_count = $${idx++}`);
    sets.push(`last_evaluated_at = CURRENT_TIMESTAMP`);
    params.push(client_count);
  }
  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  if (sets.filter(s => !s.startsWith('updated_at')).length === 0) return null;
  params.push(id);
  const res = await query(
    `UPDATE client_segments SET ${sets.join(', ')} WHERE id = $${idx} AND is_active = TRUE RETURNING *`,
    params
  );
  return res.rows[0];
};

export const deleteSegment = async (id, brandId) => {
  const res = await query(
    `UPDATE client_segments SET is_active = FALSE WHERE id = $1 AND brand_id = $2 RETURNING id`,
    [id, brandId]
  );
  return res.rows[0] || null;
};

// ============================================
// SEGMENT EVALUATION
// ============================================

const ALLOWED = {
  status:             { column: 'c.status',              ops: ['eq', 'neq'] },
  client_type:        { column: 'c.client_type',         ops: ['eq', 'neq', 'in'] },
  industry:           { column: 'c.industry',            ops: ['contains', 'eq'] },
  city:               { column: 'c.city',                ops: ['eq', 'contains'] },
  state:              { column: 'c.state',               ops: ['eq'] },
  country:            { column: 'c.country',             ops: ['eq'] },
  lead_source:        { column: 'c.lead_source',         ops: ['eq', 'in'] },
  created_at:         { column: 'c.created_at',          ops: ['before', 'after'] },
  last_portal_login:  { column: 'c.last_portal_login',   ops: ['before', 'after', 'is_null'] },
  tags:               { special: 'tags' },
  total_revenue:      { special: 'revenue' },
};

function buildWhere(filters) {
  const conditions = [];
  const params = [];
  let idx = 2; // $1 is brandId

  for (const f of (filters || [])) {
    const { field, op, value } = f;
    if (!field || !ALLOWED[field]) continue;
    const def = ALLOWED[field];

    if (def.special === 'tags') {
      const tags = Array.isArray(value) ? value : String(value).split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length === 0) continue;
      params.push(tags);
      conditions.push(`c.tags ?| $${idx++}::text[]`);
    } else if (def.special === 'revenue') {
      const sub = `(SELECT COALESCE(SUM(amount), 0) FROM payments WHERE client_id = c.id AND payment_status = 'completed')`;
      const num = parseFloat(value) || 0;
      if (op === 'gt') { params.push(num); conditions.push(`${sub} > $${idx++}`); }
      else if (op === 'lt') { params.push(num); conditions.push(`${sub} < $${idx++}`); }
    } else {
      const col = def.column;
      if (!def.ops.includes(op)) continue;
      if (op === 'eq')       { params.push(value);            conditions.push(`${col} = $${idx++}`); }
      else if (op === 'neq') { params.push(value);            conditions.push(`${col} != $${idx++}`); }
      else if (op === 'in')  {
        const arr = Array.isArray(value) ? value : [value];
        params.push(arr);
        conditions.push(`${col} = ANY($${idx++})`);
      }
      else if (op === 'contains') { params.push(`%${value}%`); conditions.push(`${col} ILIKE $${idx++}`); }
      else if (op === 'before')   { params.push(value);          conditions.push(`${col} < $${idx++}`); }
      else if (op === 'after')    { params.push(value);          conditions.push(`${col} > $${idx++}`); }
      else if (op === 'is_null')  { conditions.push(`${col} IS NULL`); }
    }
  }

  return { conditions, params };
}

export const evaluateSegment = async (brandId, filterConfig) => {
  const { conditions, params } = buildWhere(filterConfig);
  const allParams = [brandId, ...params];
  const where = ['c.brand_id = $1', 'c.is_active = TRUE', ...conditions].join(' AND ');

  const res = await query(
    `SELECT c.id, c.name, c.email, c.company, c.status, c.client_type
     FROM clients c
     WHERE ${where}
     ORDER BY c.name ASC`,
    allParams
  );
  return res.rows;
};

export const countSegment = async (brandId, filterConfig) => {
  const { conditions, params } = buildWhere(filterConfig);
  const allParams = [brandId, ...params];
  const where = ['c.brand_id = $1', 'c.is_active = TRUE', ...conditions].join(' AND ');

  const res = await query(
    `SELECT COUNT(*) AS count FROM clients c WHERE ${where}`,
    allParams
  );
  return parseInt(res.rows[0]?.count || 0);
};
