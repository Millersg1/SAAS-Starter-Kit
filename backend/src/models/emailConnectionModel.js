import { query } from '../config/database.js';

export const getConnectionsByBrand = async (brandId) => (await query(
  `SELECT id,brand_id,provider,email_address,imap_host,imap_port,imap_user,smtp_host,smtp_port,last_synced_at,is_active,created_at FROM email_connections WHERE brand_id = $1 ORDER BY created_at DESC`,
  [brandId]
)).rows;

export const getConnectionById = async (id) => (await query(`SELECT * FROM email_connections WHERE id = $1`, [id])).rows[0] || null;
export const getActiveConnections = async () => (await query(`SELECT * FROM email_connections WHERE is_active = TRUE`)).rows;

export const createConnection = async (data) => {
  const { brand_id, provider, email_address, imap_host, imap_port, imap_user, imap_password, smtp_host, smtp_port, smtp_user, smtp_password } = data;
  return (await query(
    `INSERT INTO email_connections (brand_id,provider,email_address,imap_host,imap_port,imap_user,imap_password,smtp_host,smtp_port,smtp_user,smtp_password) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,brand_id,provider,email_address,imap_host,imap_port,imap_user,smtp_host,smtp_port,last_synced_at,is_active,created_at`,
    [brand_id, provider, email_address, imap_host, imap_port || 993, imap_user, imap_password, smtp_host || null, smtp_port || 587, smtp_user || null, smtp_password || null]
  )).rows[0];
};

export const updateLastSynced = async (id) => { await query(`UPDATE email_connections SET last_synced_at = NOW() WHERE id = $1`, [id]); };

export const deleteConnection = async (id) => (await query(`DELETE FROM email_connections WHERE id = $1 RETURNING id`, [id])).rows[0] || null;
