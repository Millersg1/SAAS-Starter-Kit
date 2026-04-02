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
 * Look up a CMS site by its custom domain.
 */
async function getCmsSiteByDomain(hostname) {
  try {
    const result = await query(
      `SELECT cs.id AS site_id, cs.brand_id, cs.name
       FROM cms_sites cs
       WHERE cs.domain = $1 AND cs.is_active = TRUE`,
      [hostname]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

/**
 * Middleware: detect requests arriving on a custom domain.
 * - If it matches a brand's custom_domain → attach req.customDomainBrandId (portal)
 * - If it matches a CMS site's domain → redirect to site renderer
 */
export const customDomainMiddleware = async (req, res, next) => {
  const host = (req.hostname || '').toLowerCase().replace(/^www\./, '');
  const appHost = (process.env.APP_HOSTNAME || 'saassurface.com').toLowerCase();

  if (host && host !== appHost && host !== 'localhost' && host !== '127.0.0.1') {
    // Check brand portal first
    const brand = await getBrandByCustomDomain(host);
    if (brand) {
      req.customDomainBrandId = brand.id;
      return next();
    }

    // Check CMS site — serve website directly
    const cmsSite = await getCmsSiteByDomain(host);
    if (cmsSite) {
      // Rewrite URL to hit the site renderer
      const slug = req.path === '/' ? '' : req.path.replace(/^\//, '');
      req.url = `/site/${cmsSite.site_id}/${slug}`;
      req.cmsSiteId = cmsSite.site_id;
      return next();
    }
  }

  next();
};
