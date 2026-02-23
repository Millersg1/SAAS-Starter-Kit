import { query } from '../config/database.js';

export const createDeal = async (data) => {
  const {
    brand_id, client_id, proposal_id, title, value = 0, currency = 'USD',
    stage = 'lead', probability = 20, expected_close_date, lost_reason,
    notes, assigned_to, created_by
  } = data;

  const result = await query(
    `INSERT INTO pipeline_deals
       (brand_id, client_id, proposal_id, title, value, currency, stage,
        probability, expected_close_date, lost_reason, notes, assigned_to, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [brand_id, client_id || null, proposal_id || null, title, value, currency,
     stage, probability, expected_close_date || null, lost_reason || null,
     notes || null, assigned_to || null, created_by]
  );
  return result.rows[0];
};

export const getBrandDeals = async (brandId, filters = {}) => {
  const { stage, assigned_to } = filters;
  let paramCount = 1;
  const params = [brandId];
  let where = `d.brand_id = $${paramCount} AND d.is_active = TRUE`;

  if (stage) {
    paramCount++;
    where += ` AND d.stage = $${paramCount}`;
    params.push(stage);
  }
  if (assigned_to) {
    paramCount++;
    where += ` AND d.assigned_to = $${paramCount}`;
    params.push(assigned_to);
  }

  const result = await query(
    `SELECT d.*,
            c.name AS client_name, c.email AS client_email, c.company AS client_company,
            u.name AS assigned_to_name,
            p.proposal_number, p.title AS proposal_title
     FROM pipeline_deals d
     LEFT JOIN clients c ON d.client_id = c.id
     LEFT JOIN users u ON d.assigned_to = u.id
     LEFT JOIN proposals p ON d.proposal_id = p.id
     WHERE ${where}
     ORDER BY d.created_at DESC`,
    params
  );
  return result.rows;
};

export const getDealById = async (dealId) => {
  const result = await query(
    `SELECT d.*,
            c.name AS client_name, c.email AS client_email, c.company AS client_company,
            u.name AS assigned_to_name,
            p.proposal_number, p.title AS proposal_title
     FROM pipeline_deals d
     LEFT JOIN clients c ON d.client_id = c.id
     LEFT JOIN users u ON d.assigned_to = u.id
     LEFT JOIN proposals p ON d.proposal_id = p.id
     WHERE d.id = $1 AND d.is_active = TRUE`,
    [dealId]
  );
  return result.rows[0] || null;
};

export const updateDeal = async (dealId, fields) => {
  const allowed = ['title','value','currency','stage','probability',
                   'expected_close_date','lost_reason','notes','assigned_to','client_id','proposal_id'];
  const updates = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${idx}`);
      params.push(fields[key]);
      idx++;
    }
  }

  if (updates.length === 0) return getDealById(dealId);

  params.push(dealId);
  const result = await query(
    `UPDATE pipeline_deals SET ${updates.join(', ')} WHERE id = $${idx} AND is_active = TRUE RETURNING *`,
    params
  );
  return result.rows[0] || null;
};

export const deleteDeal = async (dealId) => {
  const result = await query(
    `UPDATE pipeline_deals SET is_active = FALSE WHERE id = $1 RETURNING id`,
    [dealId]
  );
  return result.rows[0] || null;
};

export const getPipelineSummary = async (brandId) => {
  const result = await query(
    `SELECT stage,
            COUNT(*) AS deal_count,
            COALESCE(SUM(value), 0) AS total_value,
            COALESCE(SUM(value * probability / 100.0), 0) AS weighted_value
     FROM pipeline_deals
     WHERE brand_id = $1 AND is_active = TRUE
     GROUP BY stage`,
    [brandId]
  );

  const stages = ['lead','qualified','proposal_sent','negotiation','won','lost'];
  const byStage = {};
  for (const s of stages) {
    byStage[s] = { deal_count: 0, total_value: 0, weighted_value: 0 };
  }
  for (const row of result.rows) {
    byStage[row.stage] = {
      deal_count: parseInt(row.deal_count),
      total_value: parseFloat(row.total_value),
      weighted_value: parseFloat(row.weighted_value)
    };
  }

  const totalWeighted = Object.values(byStage)
    .filter((_, i) => stages[i] !== 'lost')
    .reduce((sum, s) => sum + s.weighted_value, 0);

  return { byStage, totalWeighted };
};
