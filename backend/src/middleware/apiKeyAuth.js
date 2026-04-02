import crypto from 'crypto';
import { query } from '../config/database.js';

/**
 * API Key authentication middleware.
 * Supports both header-based (X-API-Key) and query-based (?api_key=) auth.
 * Falls through to JWT auth if no API key is provided.
 */
export const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  // If no API key, fall through to normal auth
  if (!apiKey) return next();

  try {
    // Hash the key for secure comparison
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const result = await query(
      `SELECT ak.*, bm.user_id, bm.role AS member_role,
              u.name AS user_name, u.email AS user_email, u.is_superadmin
       FROM api_keys ak
       JOIN brand_members bm ON bm.brand_id = ak.brand_id AND bm.user_id = ak.created_by
       JOIN users u ON u.id = bm.user_id
       WHERE ak.key_hash = $1 AND ak.is_active = TRUE
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid or expired API key.',
      });
    }

    const keyRecord = result.rows[0];

    // Check scopes if defined
    if (keyRecord.scopes && keyRecord.scopes.length > 0) {
      const method = req.method.toLowerCase();
      const path = req.baseUrl + req.path;
      const hasAccess = keyRecord.scopes.some(scope => {
        if (scope === '*') return true;
        if (scope === 'read' && method === 'get') return true;
        if (scope === 'write' && ['post', 'put', 'patch', 'delete'].includes(method)) return true;
        // Route-specific scopes like 'clients:read', 'invoices:write'
        const [resource, action] = scope.split(':');
        if (path.includes(`/${resource}`) && (!action || (action === 'read' && method === 'get') || (action === 'write' && method !== 'get'))) {
          return true;
        }
        return false;
      });
      if (!hasAccess) {
        return res.status(403).json({
          status: 'fail',
          message: 'API key does not have permission for this action.',
        });
      }
    }

    // Update last used timestamp (non-blocking)
    query(
      `UPDATE api_keys SET last_used_at = NOW(), request_count = COALESCE(request_count, 0) + 1 WHERE id = $1`,
      [keyRecord.id]
    ).catch(() => {});

    // Set req.user as if JWT-authenticated
    req.user = {
      id: keyRecord.user_id,
      name: keyRecord.user_name,
      email: keyRecord.user_email,
      is_superadmin: keyRecord.is_superadmin,
      via_api_key: true,
      api_key_id: keyRecord.id,
      api_key_name: keyRecord.name,
    };

    // If key is scoped to a brand, attach it
    if (keyRecord.brand_id) {
      req.apiBrandId = keyRecord.brand_id;
    }

    next();
  } catch (err) {
    console.error('[ApiKeyAuth] Error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Authentication error' });
  }
};
