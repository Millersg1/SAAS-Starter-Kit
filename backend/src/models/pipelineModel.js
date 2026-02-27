import { query } from '../config/database.js';

// ============================================
// PIPELINE MANAGEMENT
// ============================================

export const createPipeline = async (data) => {
  const { brand_id, name, description, stages, is_default } = data;
  const result = await query(
    `INSERT INTO pipelines (brand_id, name, description, stages, is_default)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [brand_id, name, description || null, JSON.stringify(stages || []), !!is_default]
  );
  return result.rows[0];
};

export const getBrandPipelines = async (brandId) => {
  const result = await query(
    `SELECT * FROM pipelines WHERE brand_id = $1 AND is_active = TRUE ORDER BY is_default DESC, created_at ASC`,
    [brandId]
  );
  return result.rows;
};

export const getPipelineById = async (id) => {
  const result = await query(
    `SELECT * FROM pipelines WHERE id = $1 AND is_active = TRUE`,
    [id]
  );
  return result.rows[0] || null;
};

export const updatePipeline = async (id, data) => {
  const { name, description, stages, is_default } = data;
  const sets = [];
  const params = [];
  let idx = 1;

  if (name !== undefined)        { sets.push(`name = $${idx++}`);        params.push(name); }
  if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description); }
  if (stages !== undefined)      { sets.push(`stages = $${idx++}`);      params.push(JSON.stringify(stages)); }
  if (is_default !== undefined)  { sets.push(`is_default = $${idx++}`);  params.push(!!is_default); }

  if (sets.length === 0) return getPipelineById(id);

  params.push(id);
  const result = await query(
    `UPDATE pipelines SET ${sets.join(', ')} WHERE id = $${idx} AND is_active = TRUE RETURNING *`,
    params
  );
  return result.rows[0];
};

export const deletePipeline = async (id) => {
  const result = await query(
    `UPDATE pipelines SET is_active = FALSE WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
};

export const getDefaultPipeline = async (brandId) => {
  const result = await query(
    `SELECT * FROM pipelines
     WHERE brand_id = $1 AND is_active = TRUE
     ORDER BY is_default DESC, created_at ASC
     LIMIT 1`,
    [brandId]
  );
  return result.rows[0] || null;
};

// ============================================
// DEALS
// ============================================

export const createDeal = async (data) => {
  const {
    brand_id, client_id, proposal_id, title, value = 0, currency = 'USD',
    stage, probability = 20, expected_close_date, lost_reason,
    notes, assigned_to, created_by, pipeline_id
  } = data;

  // Auto-assign to default pipeline if no pipeline_id provided
  let resolvedPipelineId = pipeline_id || null;
  if (!resolvedPipelineId) {
    const defaultPipeline = await getDefaultPipeline(brand_id);
    resolvedPipelineId = defaultPipeline?.id || null;
  }

  // Default stage to first stage of pipeline
  let resolvedStage = stage;
  if (!resolvedStage && resolvedPipelineId) {
    const pipeline = await getPipelineById(resolvedPipelineId);
    const firstStage = pipeline?.stages?.[0] || 'lead';
    resolvedStage = firstStage.toLowerCase().replace(/\s+/g, '_');
  }
  if (!resolvedStage) resolvedStage = 'lead';

  const result = await query(
    `INSERT INTO pipeline_deals
       (brand_id, client_id, proposal_id, title, value, currency, stage,
        probability, expected_close_date, lost_reason, notes, assigned_to, created_by, pipeline_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [brand_id, client_id || null, proposal_id || null, title, value, currency,
     resolvedStage, probability, expected_close_date || null, lost_reason || null,
     notes || null, assigned_to || null, created_by, resolvedPipelineId]
  );
  return result.rows[0];
};

export const getBrandDeals = async (brandId, filters = {}) => {
  const { stage, assigned_to, pipeline_id } = filters;
  let paramCount = 1;
  const params = [brandId];
  let where = `d.brand_id = $${paramCount} AND d.is_active = TRUE`;

  if (pipeline_id) {
    paramCount++;
    where += ` AND (d.pipeline_id = $${paramCount} OR d.pipeline_id IS NULL)`;
    params.push(pipeline_id);
  }
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
                   'expected_close_date','lost_reason','notes','assigned_to',
                   'client_id','proposal_id','pipeline_id'];
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

// ============================================
// SUMMARY
// ============================================

const normalizeStage = (s) => (s || '').toLowerCase().replace(/[\s_]+/g, '_');

export const getPipelineSummary = async (brandId, pipelineId) => {
  let stages;
  let whereClause;
  let params;

  if (pipelineId) {
    const pipelineRes = await query(
      `SELECT stages FROM pipelines WHERE id = $1 AND is_active = TRUE`,
      [pipelineId]
    );
    stages = pipelineRes.rows[0]?.stages || [];
    whereClause = `brand_id = $1 AND is_active = TRUE AND (pipeline_id = $2 OR pipeline_id IS NULL)`;
    params = [brandId, pipelineId];
  } else {
    stages = ['lead', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'];
    whereClause = `brand_id = $1 AND is_active = TRUE`;
    params = [brandId];
  }

  const result = await query(
    `SELECT stage,
            COUNT(*) AS deal_count,
            COALESCE(SUM(value), 0) AS total_value,
            COALESCE(SUM(value * probability / 100.0), 0) AS weighted_value
     FROM pipeline_deals
     WHERE ${whereClause}
     GROUP BY stage`,
    params
  );

  const byStage = {};
  for (const stage of stages) {
    byStage[stage] = { deal_count: 0, total_value: 0, weighted_value: 0 };
  }
  for (const row of result.rows) {
    const matchedStage = stages.find(s => normalizeStage(s) === normalizeStage(row.stage));
    if (matchedStage) {
      byStage[matchedStage] = {
        deal_count: parseInt(row.deal_count),
        total_value: parseFloat(row.total_value),
        weighted_value: parseFloat(row.weighted_value)
      };
    }
  }

  const totalWeighted = Object.entries(byStage)
    .filter(([stage]) => !stage.toLowerCase().includes('lost'))
    .reduce((sum, [, data]) => sum + data.weighted_value, 0);

  return { byStage, totalWeighted, stages };
};
