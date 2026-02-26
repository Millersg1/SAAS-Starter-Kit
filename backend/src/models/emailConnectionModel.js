import { query } from '../config/database.js';

export const getConnectionsByBrand = async (brandId) => (await query(
  `SELECT id,brand_id,provider,email_address,imap_host,imap_port,imap_user,last_synced_at,is_active,created_at FROM email_connections WHERE brand_id = $1 ORDER BY created_at DESC`,
  [brandId]
)).rows;

export const getConnectionById = async (id) => (await query(`SELECT * FROM email_connections WHERE id = $1`, [id])).rows[0] || null;
export const getActiveConnections = async () => (await query(`SELECT * FROM email_connections WHERE is_active = TRUE`)).rows;

export const createConnection = async (data) => {
  const { brand_id, provider, email_address, imap_host, imap_port, imap_user, imap_password } = data;
  return (await query(
    `INSERT INTO email_connections (brand_id,provider,email_address,imap_host,imap_port,imap_user,imap_password) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,brand_id,provider,email_address,imap_host,imap_port,imap_user,last_synced_at,is_active,created_at`,
    [brand_id, provider, email_address, imap_host, imap_port || 993, imap_user, imap_password]
  )).rows[0];
};

export const updateLastSynced = async (id) => { await query(`UPDATE email_connections SET last_synced_at = NOW() WHERE id = $1`, [id]); };

export const deleteConnection = async (id) => (await query(`DELETE FROM email_connections WHERE id = $1 RETURNING id`, [id])).rows[0] || null;
