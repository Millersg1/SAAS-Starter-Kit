import { query } from '../config/database.js';

const genContractNumber = async () => {
  const res = await query(`SELECT nextval('contract_number_seq') as n`);
  return `CON-${res.rows[0].n}`;
};

export const getContractsByBrand = async (brandId, { status, client_id, limit = 50, offset = 0 } = {}) => {
  const conditions = ['c.brand_id = $1', 'c.is_active = TRUE'];
  const params = [brandId];
  let p = 2;
  if (status) { conditions.push(`c.status = $${p++}`); params.push(status); }
  if (client_id) { conditions.push(`c.client_id = $${p++}`); params.push(client_id); }
  params.push(limit, offset);

  const result = await query(
    `SELECT c.*, cl.name as client_name, cl.company as client_company
     FROM contracts c
     LEFT JOIN clients cl ON cl.id = c.client_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.created_at DESC
     LIMIT $${p++} OFFSET $${p}`,
    params
  );
  return result.rows;
};

export const getContractById = async (id) => {
  const result = await query(
    `SELECT c.*, cl.name as client_name, cl.email as client_email, cl.company as client_company
     FROM contracts c
     LEFT JOIN clients cl ON cl.id = c.client_id
     WHERE c.id = $1 AND c.is_active = TRUE`,
    [id]
  );
  return result.rows[0] || null;
};

export const getContractByIdForPortal = async (id, brandId) => {
  const result = await query(
    `SELECT c.*, cl.name as client_name, cl.email as client_email,
            b.name as brand_name
     FROM contracts c
     LEFT JOIN clients cl ON cl.id = c.client_id
     LEFT JOIN brands b ON b.id = c.brand_id
     WHERE c.id = $1 AND c.brand_id = $2 AND c.is_active = TRUE`,
    [id, brandId]
  );
  return result.rows[0] || null;
};

export const createContract = async ({
  brand_id, client_id, project_id, title, content, issue_date, expiry_date, notes, created_by
}) => {
  const contract_number = await genContractNumber();
  const result = await query(
    `INSERT INTO contracts
       (brand_id, client_id, project_id, contract_number, title, content, issue_date, expiry_date, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [brand_id, client_id || null, project_id || null, contract_number, title, content || '', issue_date || null, expiry_date || null, notes || null, created_by]
  );
  return result.rows[0];
};

export const updateContract = async (id, fields) => {
  const allowed = ['title', 'content', 'status', 'issue_date', 'expiry_date', 'notes',
                   'client_signature', 'signed_by_name', 'signed_by_email', 'signed_at'];
  const updates = [];
  const params = [];
  let p = 1;
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${p++}`);
      params.push(fields[key]);
    }
  }
  if (updates.length === 0) return getContractById(id);
  updates.push(`updated_at = NOW()`);
  params.push(id);
  const result = await query(
    `UPDATE contracts SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
    params
  );
  return result.rows[0];
};

export const deleteContract = async (id) => {
  await query(`UPDATE contracts SET is_active = FALSE WHERE id = $1`, [id]);
};
