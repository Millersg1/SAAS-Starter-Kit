import { query } from '../config/database.js';

export const getFieldDefs = async (brandId, entityType = 'client') => {
  const res = await query(
    `SELECT * FROM custom_field_definitions
     WHERE brand_id = $1 AND entity_type = $2 AND is_active = TRUE
     ORDER BY position ASC, created_at ASC`,
    [brandId, entityType]
  );
  return res.rows;
};

export const createFieldDef = async (data) => {
  const { brand_id, entity_type = 'client', field_key, field_label, field_type = 'text', options = [], required = false, position = 0 } = data;
  const res = await query(
    `INSERT INTO custom_field_definitions
       (brand_id, entity_type, field_key, field_label, field_type, options, required, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [brand_id, entity_type, field_key, field_label, field_type, JSON.stringify(options), required, position]
  );
  return res.rows[0];
};

export const updateFieldDef = async (id, brandId, data) => {
  const { field_label, field_type, options, required, position } = data;
  const res = await query(
    `UPDATE custom_field_definitions
     SET field_label = COALESCE($1, field_label),
         field_type  = COALESCE($2, field_type),
         options     = COALESCE($3, options),
         required    = COALESCE($4, required),
         position    = COALESCE($5, position)
     WHERE id = $6 AND brand_id = $7
     RETURNING *`,
    [field_label, field_type, options ? JSON.stringify(options) : null, required ?? null, position ?? null, id, brandId]
  );
  return res.rows[0];
};

export const deleteFieldDef = async (id, brandId) => {
  await query(
    `UPDATE custom_field_definitions SET is_active = FALSE WHERE id = $1 AND brand_id = $2`,
    [id, brandId]
  );
};

export const reorderFields = async (ids) => {
  for (let i = 0; i < ids.length; i++) {
    await query(`UPDATE custom_field_definitions SET position = $1 WHERE id = $2`, [i, ids[i]]);
  }
};
