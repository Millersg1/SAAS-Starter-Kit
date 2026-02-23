import { query } from '../config/database.js';

export const createActivity = async (data) => {
  const { brand_id, client_id, user_id, activity_type = 'note', title, body, metadata = {} } = data;

  const result = await query(
    `INSERT INTO client_activities (brand_id, client_id, user_id, activity_type, title, body, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [brand_id, client_id, user_id || null, activity_type, title || null, body || null, JSON.stringify(metadata)]
  );
  return result.rows[0];
};

export const getClientActivities = async (clientId, limit = 50) => {
  const result = await query(
    `SELECT a.*, u.name AS user_name, u.avatar_url AS user_avatar
     FROM client_activities a
     LEFT JOIN users u ON a.user_id = u.id
     WHERE a.client_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [clientId, limit]
  );
  return result.rows;
};

export const getBrandActivities = async (brandId, filters = {}) => {
  const { client_id, activity_type, limit = 100 } = filters;
  let paramCount = 1;
  const params = [brandId];
  let where = `a.brand_id = $${paramCount}`;

  if (client_id) {
    paramCount++;
    where += ` AND a.client_id = $${paramCount}`;
    params.push(client_id);
  }
  if (activity_type) {
    paramCount++;
    where += ` AND a.activity_type = $${paramCount}`;
    params.push(activity_type);
  }

  paramCount++;
  params.push(limit);

  const result = await query(
    `SELECT a.*, u.name AS user_name, c.name AS client_name
     FROM client_activities a
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN clients c ON a.client_id = c.id
     WHERE ${where}
     ORDER BY a.created_at DESC
     LIMIT $${paramCount}`,
    params
  );
  return result.rows;
};

export const deleteActivity = async (activityId) => {
  const result = await query(
    `DELETE FROM client_activities WHERE id = $1 RETURNING id`,
    [activityId]
  );
  return result.rows[0] || null;
};
