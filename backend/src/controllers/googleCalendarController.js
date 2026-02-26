import * as brandModel from '../models/brandModel.js';
import {
  getAuthUrl, exchangeCodeForTokens, saveConnection,
  getConnectionForBrand, disconnectForBrand, syncForBrand
} from '../utils/googleCalendarSync.js';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

export const getConnection = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const connection = await getConnectionForBrand(brandId);
    res.json({ status: 'success', data: { connected: !!connection, last_synced_at: connection?.last_synced_at || null } });
  } catch (e) { next(e); }
};

export const initiateAuth = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ status: 'fail', message: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env' });
    }
    const url = getAuthUrl(brandId);
    res.json({ status: 'success', data: { url } });
  } catch (e) { next(e); }
};

export const oauthCallback = async (req, res, next) => {
  try {
    const { code, state: brandId } = req.query;
    if (!code || !brandId) return res.redirect(`${process.env.FRONTEND_URL}/calendar?error=invalid`);
    const tokens = await exchangeCodeForTokens(code);
    await saveConnection(brandId, tokens);
    res.redirect(`${process.env.FRONTEND_URL}/calendar?google=connected`);
  } catch (e) {
    console.error('Google OAuth callback error:', e.message);
    res.redirect(`${process.env.FRONTEND_URL}/calendar?error=oauth_failed`);
  }
};

export const disconnect = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    await disconnectForBrand(brandId);
    res.json({ status: 'success', message: 'Google Calendar disconnected' });
  } catch (e) { next(e); }
};

export const syncNow = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const connection = await getConnectionForBrand(brandId);
    if (!connection) return res.status(400).json({ status: 'fail', message: 'Google Calendar not connected' });
    await syncForBrand(connection);
    res.json({ status: 'success', message: 'Sync complete' });
  } catch (e) { next(e); }
};
