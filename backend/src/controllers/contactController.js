import { query } from '../config/database.js';

const getContacts = async (req, res, next) => {
  try {
    const { brandId } = req;
    const { clientId } = req.query;

    let sql = 'SELECT * FROM contacts WHERE brand_id = $1';
    const params = [brandId];

    if (clientId) {
      sql += ' AND client_id = $2 ORDER BY last_name, first_name';
      params.push(clientId);
    } else {
      sql += ' ORDER BY last_name, first_name';
    }

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
};

const getContactById = async (req, res, next) => {
  try {
    const { brandId } = req;
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM contacts WHERE id = $1 AND brand_id = $2', [id, brandId]);

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: 'Contact not found' });
    }
  } catch (e) { next(e); }
};

const createContact = async (req, res, next) => {
  try {
    const { brandId } = req;
    const { client_id, first_name, last_name, email, phone, job_title } = req.body;

    const { rows } = await query(
      'INSERT INTO contacts (brand_id, client_id, first_name, last_name, email, phone, job_title) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [brandId, client_id, first_name, last_name, email, phone, job_title]
    );

    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

const updateContact = async (req, res, next) => {
  try {
    const { brandId } = req;
    const { id } = req.params;
    const { client_id, first_name, last_name, email, phone, job_title, is_primary_contact } = req.body;

    const { rows } = await query(
      'UPDATE contacts SET client_id = $1, first_name = $2, last_name = $3, email = $4, phone = $5, job_title = $6, is_primary_contact = $7, updated_at = NOW() WHERE id = $8 AND brand_id = $9 RETURNING *',
      [client_id, first_name, last_name, email, phone, job_title, is_primary_contact, id, brandId]
    );

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: 'Contact not found' });
    }
  } catch (e) { next(e); }
};

const deleteContact = async (req, res, next) => {
  try {
    const { brandId } = req;
    const { id } = req.params;

    const { rowCount } = await query('DELETE FROM contacts WHERE id = $1 AND brand_id = $2', [id, brandId]);

    if (rowCount > 0) {
      res.json({ message: 'Contact removed' });
    } else {
      res.status(404).json({ message: 'Contact not found' });
    }
  } catch (e) { next(e); }
};

export {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
};
