import { query } from '../config/database.js';

/**
 * Look up a brand by its custom_domain.
 */
async function getBrandByCustomDomain(hostname) {
  try {
    const result = await query(
      `SELECT id, name, slug FROM brands WHERE custom_domain = $1 AND is_active = TRUE`,
      [hostname]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

/**
 * Middleware: detect requests arriving on a custom portal domain and attach
 * req.customDomainBrandId so portal routes can use it without requiring
 * the client to pass brandId explicitly.
 */
export const customDomainMiddleware = async (req, res, next) => {
  const host = (req.hostname || '').toLowerCase().replace(/^www\./, '');
  const appHost = (process.env.APP_HOSTNAME || 'faithharborclienthub.com').toLowerCase();

  if (host && host !== appHost && host !== 'localhost' && host !== '127.0.0.1') {
    const brand = await getBrandByCustomDomain(host);
    if (brand) {
      req.customDomainBrandId = brand.id;
    }
  }

  next();
};
