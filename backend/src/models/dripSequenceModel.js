import { query } from '../config/database.js';

// ── Sequences ────────────────────────────────────────────────────────────────

export const getSequences = async (brandId) => {
  const result = await query(
    `SELECT s.*,
       (SELECT COUNT(*) FROM drip_steps ds WHERE ds.sequence_id = s.id) AS step_count,
       (SELECT COUNT(*) FROM drip_enrollments de WHERE de.sequence_id = s.id AND de.status = 'active') AS active_enrollments,
       (SELECT COUNT(*) FROM drip_enrollments de WHERE de.sequence_id = s.id) AS total_enrollments,
       (SELECT COUNT(*) FROM drip_sends dse WHERE dse.brand_id = s.brand_id
          AND dse.enrollment_id IN (SELECT id FROM drip_enrollments WHERE sequence_id = s.id)) AS total_sent
     FROM drip_sequences s
     WHERE s.brand_id = $1
     ORDER BY s.created_at DESC`,
    [brandId]
  );
  return result.rows;
};

export const createSequence = async ({ brand_id, name, description, created_by }) => {
  const result = await query(
    `INSERT INTO drip_sequences (brand_id, name, description, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [brand_id, name, description || null, created_by || null]
  );
  return result.rows[0];
};

export const getSequenceById = async (id, brandId) => {
  const seqResult = await query(
    `SELECT * FROM drip_sequences WHERE id = $1 AND brand_id = $2`,
    [id, brandId]
  );
  if (!seqResult.rows[0]) return null;
  const stepsResult = await query(
    `SELECT * FROM drip_steps WHERE sequence_id = $1 ORDER BY position ASC`,
    [id]
  );
  return { ...seqResult.rows[0], steps: stepsResult.rows };
};

export const updateSequence = async (id, brandId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;
  if (data.name !== undefined)        { fields.push(`name = $${idx++}`);        values.push(data.name); }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
  if (data.status !== undefined)      { fields.push(`status = $${idx++}`);      values.push(data.status); }
  if (!fields.length) return null;
  fields.push(`updated_at = NOW()`);
  values.push(id, brandId);
  const result = await query(
    `UPDATE drip_sequences SET ${fields.join(', ')} WHERE id = $${idx++} AND brand_id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const deleteSequence = async (id, brandId) => {
  await query(`DELETE FROM drip_sequences WHERE id = $1 AND brand_id = $2`, [id, brandId]);
};

// ── Steps ────────────────────────────────────────────────────────────────────

export const createStep = async (sequenceId, data) => {
  // Get max position
  const posResult = await query(
    `SELECT COALESCE(MAX(position), 0) AS max_pos FROM drip_steps WHERE sequence_id = $1`,
    [sequenceId]
  );
  const position = posResult.rows[0].max_pos + 1;
  const result = await query(
    `INSERT INTO drip_steps (sequence_id, position, subject, html_content, delay_days, delay_hours, from_name, from_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      sequenceId,
      position,
      data.subject,
      data.html_content,
      data.delay_days || 0,
      data.delay_hours || 0,
      data.from_name || null,
      data.from_email || null,
    ]
  );
  return result.rows[0];
};

export const updateStep = async (id, sequenceId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;
  if (data.subject !== undefined)      { fields.push(`subject = $${idx++}`);      values.push(data.subject); }
  if (data.html_content !== undefined) { fields.push(`html_content = $${idx++}`); values.push(data.html_content); }
  if (data.delay_days !== undefined)   { fields.push(`delay_days = $${idx++}`);   values.push(data.delay_days); }
  if (data.delay_hours !== undefined)  { fields.push(`delay_hours = $${idx++}`);  values.push(data.delay_hours); }
  if (data.from_name !== undefined)    { fields.push(`from_name = $${idx++}`);    values.push(data.from_name); }
  if (data.from_email !== undefined)   { fields.push(`from_email = $${idx++}`);   values.push(data.from_email); }
  if (!fields.length) return null;
  fields.push(`updated_at = NOW()`);
  values.push(id, sequenceId);
  const result = await query(
    `UPDATE drip_steps SET ${fields.join(', ')} WHERE id = $${idx++} AND sequence_id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const deleteStep = async (id, sequenceId) => {
  const step = await query(`SELECT position FROM drip_steps WHERE id = $1`, [id]);
  if (!step.rows[0]) return;
  const pos = step.rows[0].position;
  await query(`DELETE FROM drip_steps WHERE id = $1 AND sequence_id = $2`, [id, sequenceId]);
  // Reorder subsequent positions
  await query(
    `UPDATE drip_steps SET position = position - 1 WHERE sequence_id = $1 AND position > $2`,
    [sequenceId, pos]
  );
};

export const reorderSteps = async (sequenceId, orderedIds) => {
  for (let i = 0; i < orderedIds.length; i++) {
    await query(
      `UPDATE drip_steps SET position = $1 WHERE id = $2 AND sequence_id = $3`,
      [i + 1, orderedIds[i], sequenceId]
    );
  }
};

// ── Enrollments ──────────────────────────────────────────────────────────────

export const getEnrollments = async (sequenceId, brandId, opts = {}) => {
  let sql = `SELECT e.*,
      (SELECT COUNT(*) FROM drip_sends ds WHERE ds.enrollment_id = e.id) AS emails_sent
     FROM drip_enrollments e
     WHERE e.sequence_id = $1 AND e.brand_id = $2`;
  const values = [sequenceId, brandId];
  if (opts.status) { sql += ` AND e.status = $${values.length + 1}`; values.push(opts.status); }
  sql += ` ORDER BY e.enrolled_at DESC`;
  const result = await query(sql, values);
  return result.rows;
};

export const enroll = async (data) => {
  // next_send_at = NOW() means process immediately on next cron tick
  const result = await query(
    `INSERT INTO drip_enrollments
       (sequence_id, brand_id, contact_email, contact_name, client_id, current_step, next_send_at)
     VALUES ($1, $2, $3, $4, $5, 0, NOW())
     ON CONFLICT (sequence_id, contact_email) DO NOTHING
     RETURNING *`,
    [data.sequence_id, data.brand_id, data.contact_email, data.contact_name || null, data.client_id || null]
  );
  return result.rows[0] || null; // null = already enrolled
};

export const unenroll = async (id, brandId) => {
  const result = await query(
    `UPDATE drip_enrollments SET status = 'unsubscribed' WHERE id = $1 AND brand_id = $2 RETURNING *`,
    [id, brandId]
  );
  return result.rows[0];
};

export const unsubscribeByEmail = async (sequenceId, email) => {
  await query(
    `UPDATE drip_enrollments SET status = 'unsubscribed' WHERE sequence_id = $1 AND contact_email = $2`,
    [sequenceId, email]
  );
};

// ── Cron helpers ─────────────────────────────────────────────────────────────

export const getActiveEnrollmentsDue = async () => {
  const result = await query(
    `SELECT e.*,
       s.brand_id AS seq_brand_id,
       b.name AS brand_name,
       b.settings AS brand_settings
     FROM drip_enrollments e
     JOIN drip_sequences s ON s.id = e.sequence_id
     JOIN brands b ON b.id = s.brand_id
     WHERE e.status = 'active'
       AND e.next_send_at <= NOW()
       AND s.status = 'active'
     LIMIT 100`,
    []
  );
  return result.rows;
};

export const getStepsForSequence = async (sequenceId) => {
  const result = await query(
    `SELECT * FROM drip_steps WHERE sequence_id = $1 ORDER BY position ASC`,
    [sequenceId]
  );
  return result.rows;
};

export const advanceEnrollment = async (id, nextStep, nextSendAt) => {
  await query(
    `UPDATE drip_enrollments SET current_step = $1, next_send_at = $2 WHERE id = $3`,
    [nextStep, nextSendAt, id]
  );
};

export const completeEnrollment = async (id) => {
  await query(
    `UPDATE drip_enrollments SET status = 'completed', completed_at = NOW() WHERE id = $1`,
    [id]
  );
};

export const recordSend = async ({ enrollment_id, step_id, brand_id, to_email, subject }) => {
  const result = await query(
    `INSERT INTO drip_sends (enrollment_id, step_id, brand_id, to_email, subject)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [enrollment_id, step_id, brand_id, to_email, subject]
  );
  return result.rows[0];
};

// ── Stats ────────────────────────────────────────────────────────────────────

export const getSequenceStats = async (sequenceId) => {
  const [enrollResult, stepResult] = await Promise.all([
    query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'active') AS active,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE status = 'unsubscribed') AS unsubscribed
       FROM drip_enrollments WHERE sequence_id = $1`,
      [sequenceId]
    ),
    query(
      `SELECT
         ds.id, ds.subject, ds.position,
         COUNT(dse.id) AS sent_count,
         COUNT(dse.id) FILTER (WHERE dse.open_count > 0) AS opened_count,
         COUNT(dse.id) FILTER (WHERE dse.click_count > 0) AS clicked_count
       FROM drip_steps ds
       LEFT JOIN drip_sends dse ON dse.step_id = ds.id
       WHERE ds.sequence_id = $1
       GROUP BY ds.id, ds.subject, ds.position
       ORDER BY ds.position ASC`,
      [sequenceId]
    ),
  ]);
  return {
    enrollments: enrollResult.rows[0],
    steps: stepResult.rows,
  };
};
