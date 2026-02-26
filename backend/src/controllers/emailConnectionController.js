import * as emailConnectionModel from '../models/emailConnectionModel.js';
import * as brandModel from '../models/brandModel.js';
import { syncEmailConnection } from '../utils/imapSync.js';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

export const listConnections = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const connections = await emailConnectionModel.getConnectionsByBrand(req.params.brandId);
    res.json({ status: 'success', data: { connections } });
  } catch (e) { next(e); }
};

export const createConnection = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const connection = await emailConnectionModel.createConnection({ ...req.body, brand_id: brandId });
    res.status(201).json({ status: 'success', data: { connection } });
  } catch (e) { next(e); }
};

export const deleteConnection = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    await emailConnectionModel.deleteConnection(req.params.connectionId);
    res.json({ status: 'success', message: 'Connection deleted' });
  } catch (e) { next(e); }
};

export const testConnection = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const conn = await emailConnectionModel.getConnectionById(req.params.connectionId);
    if (!conn) return res.status(404).json({ status: 'fail', message: 'Connection not found' });
    // Try to connect
    let { ImapFlow } = await import('imapflow');
    const client = new ImapFlow({ host: conn.imap_host, port: conn.imap_port, secure: true, auth: { user: conn.imap_user, pass: conn.imap_password }, logger: false });
    try {
      await client.connect();
      await client.logout();
      res.json({ status: 'success', message: 'Connection successful' });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: `Connection failed: ${err.message}` });
    }
  } catch (e) { next(e); }
};

export const syncNow = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const conn = await emailConnectionModel.getConnectionById(req.params.connectionId);
    if (!conn) return res.status(404).json({ status: 'fail', message: 'Connection not found' });
    res.json({ status: 'success', message: 'Sync started in background' });
    syncEmailConnection(conn).catch(e => console.error('Manual sync failed:', e.message));
  } catch (e) { next(e); }
};
