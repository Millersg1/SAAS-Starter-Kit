import express from 'express';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Render a CMS page as a full HTML website.
 * Supports two access patterns:
 *   1. /site/:siteId/:slug  — direct access by site ID
 *   2. Custom domain routing via middleware (req.cmsSite set by customDomainMiddleware)
 */

// ── Site homepage (slug = index or first published page) ─────────────────────
router.get('/site/:siteId', renderPage);
router.get('/site/:siteId/', renderPage);
router.get('/site/:siteId/:slug', renderPage);

// ── Blog listing ─────────────────────────────────────────────────────────────
router.get('/site/:siteId/blog', renderBlogIndex);

async function renderPage(req, res) {
  try {
    const { siteId, slug } = req.params;

    // Get site
    const siteRes = await query(
      `SELECT cs.*, b.name AS brand_name, b.logo_url, b.primary_color, b.secondary_color
       FROM cms_sites cs
       LEFT JOIN brands b ON b.id = cs.brand_id
       WHERE cs.id = $1 AND cs.is_active = TRUE`,
      [siteId]
    );
    const site = siteRes.rows[0];
    if (!site) return res.status(404).send(render404());

    // Get page — if no slug, get homepage (slug = 'index' or 'home' or first published page)
    let page;
    if (!slug || slug === '' || slug === 'index') {
      const pageRes = await query(
        `SELECT * FROM cms_pages
         WHERE site_id = $1 AND status = 'published' AND page_type = 'page'
         ORDER BY
           CASE WHEN slug IN ('index', 'home', 'homepage') THEN 0 ELSE 1 END,
           published_at ASC
         LIMIT 1`,
        [siteId]
      );
      page = pageRes.rows[0];
    } else {
      const pageRes = await query(
        `SELECT * FROM cms_pages
         WHERE site_id = $1 AND slug = $2 AND status = 'published'`,
        [siteId, slug]
      );
      page = pageRes.rows[0];
    }

    if (!page) return res.status(404).send(render404(site));

    // Get navigation (all published pages for this site, excluding blog posts)
    const navRes = await query(
      `SELECT title, slug, page_type FROM cms_pages
       WHERE site_id = $1 AND status = 'published' AND page_type = 'page'
       ORDER BY created_at ASC LIMIT 20`,
      [siteId]
    );
    const navPages = navRes.rows;

    const html = renderFullPage(site, page, navPages);
    res.type('text/html').send(html);
  } catch (err) {
    logger.error({ err: err.message }, 'Site render error');
    res.status(500).send(render404());
  }
}

async function renderBlogIndex(req, res) {
  try {
    const { siteId } = req.params;

    const siteRes = await query(
      `SELECT cs.*, b.name AS brand_name, b.logo_url, b.primary_color
       FROM cms_sites cs
       LEFT JOIN brands b ON b.id = cs.brand_id
       WHERE cs.id = $1 AND cs.is_active = TRUE`,
      [siteId]
    );
    const site = siteRes.rows[0];
    if (!site) return res.status(404).send(render404());

    const postsRes = await query(
      `SELECT title, slug, excerpt, featured_image_url, published_at, seo_description
       FROM cms_pages
       WHERE site_id = $1 AND status = 'published' AND page_type = 'blog'
       ORDER BY published_at DESC LIMIT 50`,
      [siteId]
    );

    const navRes = await query(
      `SELECT title, slug FROM cms_pages
       WHERE site_id = $1 AND status = 'published' AND page_type = 'page'
       ORDER BY created_at ASC LIMIT 20`,
      [siteId]
    );

    const html = renderBlogPage(site, postsRes.rows, navRes.rows);
    res.type('text/html').send(html);
  } catch (err) {
    logger.error({ err: err.message }, 'Blog render error');
    res.status(500).send(render404());
  }
}

// ── HTML Template Engine ─────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderFullPage(site, page, navPages) {
  const title = page.seo_title || page.title || site.name;
  const description = page.seo_description || site.default_seo_description || '';
  const ogImage = page.og_image_url || page.featured_image_url || site.og_image_url || '';
  const primaryColor = site.primary_color || '#2563eb';
  const siteName = site.name || site.brand_name || 'Website';
  const siteId = site.id;
  const gaId = site.google_analytics_id;
  const baseUrl = site.domain ? `https://${site.domain}` : '';
  const canonicalUrl = baseUrl ? `${baseUrl}/${page.slug}` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  ${canonicalUrl ? `<link rel="canonical" href="${escHtml(canonicalUrl)}">` : ''}

  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="${page.page_type === 'blog' ? 'article' : 'website'}">
  ${ogImage ? `<meta property="og:image" content="${escHtml(ogImage)}">` : ''}
  <meta property="og:site_name" content="${escHtml(siteName)}">
  ${canonicalUrl ? `<meta property="og:url" content="${escHtml(canonicalUrl)}">` : ''}

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  ${ogImage ? `<meta name="twitter:image" content="${escHtml(ogImage)}">` : ''}

  ${page.seo_keywords ? `<meta name="keywords" content="${escHtml(page.seo_keywords)}">` : ''}

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.6; }
    a { color: ${primaryColor}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; }

    .site-header { background: ${primaryColor}; color: white; padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    .site-header h1 { font-size: 1.25rem; font-weight: 700; }
    .site-header h1 a { color: white; text-decoration: none; }
    .site-nav { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .site-nav a { color: rgba(255,255,255,0.85); font-size: 0.9rem; font-weight: 500; }
    .site-nav a:hover { color: white; text-decoration: none; }
    .site-nav a.active { color: white; border-bottom: 2px solid white; }

    .site-hero { position: relative; padding: 4rem 2rem; text-align: center; background: linear-gradient(135deg, ${primaryColor}11, ${primaryColor}05); }
    .site-hero h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; color: #111827; }

    .site-content { max-width: 800px; margin: 0 auto; padding: 3rem 2rem; font-size: 1.05rem; }
    .site-content h1, .site-content h2, .site-content h3 { margin: 2rem 0 1rem; color: #111827; }
    .site-content h1 { font-size: 2rem; }
    .site-content h2 { font-size: 1.5rem; }
    .site-content h3 { font-size: 1.25rem; }
    .site-content p { margin-bottom: 1.25rem; color: #374151; }
    .site-content ul, .site-content ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
    .site-content li { margin-bottom: 0.5rem; }
    .site-content blockquote { border-left: 4px solid ${primaryColor}; padding: 1rem 1.5rem; margin: 1.5rem 0; background: #f9fafb; border-radius: 0 0.5rem 0.5rem 0; }
    .site-content img { border-radius: 0.5rem; margin: 1.5rem 0; }
    .site-content pre { background: #1f2937; color: #e5e7eb; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1.5rem 0; }
    .site-content code { background: #f3f4f6; padding: 0.15rem 0.4rem; border-radius: 0.25rem; font-size: 0.9em; }
    .site-content pre code { background: none; padding: 0; }
    .site-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    .site-content th, .site-content td { border: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; }
    .site-content th { background: #f9fafb; font-weight: 600; }

    .site-footer { background: #1f2937; color: #9ca3af; padding: 2rem; text-align: center; font-size: 0.85rem; margin-top: 4rem; }
    .site-footer a { color: #d1d5db; }

    ${page.featured_image_url ? `.featured-img { width: 100%; max-height: 400px; object-fit: cover; border-radius: 0.75rem; margin-bottom: 2rem; }` : ''}

    @media (max-width: 768px) {
      .site-header { flex-direction: column; gap: 0.75rem; text-align: center; }
      .site-hero h2 { font-size: 1.75rem; }
      .site-content { padding: 2rem 1rem; }
    }
  </style>

  ${gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${escHtml(gaId)}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${escHtml(gaId)}');</script>` : ''}
</head>
<body>
  <header class="site-header">
    <h1><a href="/site/${siteId}">${site.logo_url ? `<img src="${escHtml(site.logo_url)}" alt="${escHtml(siteName)}" style="height:32px;vertical-align:middle;margin-right:8px">` : ''}${escHtml(siteName)}</a></h1>
    <nav class="site-nav">
      ${navPages.map(p => `<a href="/site/${siteId}/${escHtml(p.slug)}" ${p.slug === page.slug ? 'class="active"' : ''}>${escHtml(p.title)}</a>`).join('\n      ')}
      ${navPages.some(p => p.page_type === 'blog') || true ? `<a href="/site/${siteId}/blog">Blog</a>` : ''}
    </nav>
  </header>

  ${page.featured_image_url ? `<img class="featured-img" src="${escHtml(page.featured_image_url)}" alt="${escHtml(page.title)}">` : ''}

  <div class="site-content">
    ${page.content || '<p>This page has no content yet.</p>'}
  </div>

  <footer class="site-footer">
    <p>&copy; ${new Date().getFullYear()} ${escHtml(siteName)}. All rights reserved.</p>
  </footer>
</body>
</html>`;
}

function renderBlogPage(site, posts, navPages) {
  const siteName = site.name || site.brand_name || 'Blog';
  const primaryColor = site.primary_color || '#2563eb';
  const siteId = site.id;

  const postCards = posts.map(p => `
    <article style="border:1px solid #e5e7eb;border-radius:0.75rem;overflow:hidden;background:white;transition:box-shadow 0.2s">
      ${p.featured_image_url ? `<img src="${escHtml(p.featured_image_url)}" alt="${escHtml(p.title)}" style="width:100%;height:200px;object-fit:cover">` : ''}
      <div style="padding:1.5rem">
        <h2 style="font-size:1.25rem;margin-bottom:0.5rem"><a href="/site/${siteId}/${escHtml(p.slug)}" style="color:#111827">${escHtml(p.title)}</a></h2>
        <p style="color:#6b7280;font-size:0.85rem;margin-bottom:0.75rem">${p.published_at ? new Date(p.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
        <p style="color:#374151;font-size:0.95rem">${escHtml(p.excerpt || p.seo_description || '')}</p>
      </div>
    </article>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog — ${escHtml(siteName)}</title>
  <meta name="description" content="Latest articles from ${escHtml(siteName)}">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.6; background: #f9fafb; }
    a { color: ${primaryColor}; text-decoration: none; }
    .site-header { background: ${primaryColor}; color: white; padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    .site-header h1 { font-size: 1.25rem; font-weight: 700; }
    .site-header h1 a { color: white; text-decoration: none; }
    .site-nav { display: flex; gap: 1.5rem; }
    .site-nav a { color: rgba(255,255,255,0.85); font-size: 0.9rem; font-weight: 500; }
    .blog-grid { max-width: 1000px; margin: 3rem auto; padding: 0 1.5rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
    .blog-header { text-align: center; padding: 3rem 1rem 1rem; }
    .blog-header h2 { font-size: 2rem; font-weight: 800; color: #111827; }
    .site-footer { background: #1f2937; color: #9ca3af; padding: 2rem; text-align: center; font-size: 0.85rem; margin-top: 4rem; }
  </style>
</head>
<body>
  <header class="site-header">
    <h1><a href="/site/${siteId}">${escHtml(siteName)}</a></h1>
    <nav class="site-nav">
      ${navPages.map(p => `<a href="/site/${siteId}/${escHtml(p.slug)}">${escHtml(p.title)}</a>`).join('\n      ')}
      <a href="/site/${siteId}/blog" style="color:white;border-bottom:2px solid white">Blog</a>
    </nav>
  </header>

  <div class="blog-header">
    <h2>Blog</h2>
    <p style="color:#6b7280;margin-top:0.5rem">${posts.length} article${posts.length !== 1 ? 's' : ''}</p>
  </div>

  <div class="blog-grid">
    ${posts.length > 0 ? postCards : '<p style="text-align:center;color:#9ca3af;grid-column:1/-1;padding:3rem">No blog posts published yet.</p>'}
  </div>

  <footer class="site-footer">
    <p>&copy; ${new Date().getFullYear()} ${escHtml(siteName)}. All rights reserved.</p>
  </footer>
</body>
</html>`;
}

function render404(site) {
  const siteName = site?.name || 'Website';
  const primaryColor = site?.primary_color || '#2563eb';
  const siteId = site?.id;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Not Found — ${escHtml(siteName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; color: #374151; text-align: center; }
    h1 { font-size: 5rem; color: ${primaryColor}; margin-bottom: 0.5rem; }
    a { color: ${primaryColor}; }
  </style>
</head>
<body>
  <div>
    <h1>404</h1>
    <p style="font-size:1.25rem;font-weight:600;margin-bottom:0.5rem">Page not found</p>
    <p style="margin-bottom:1.5rem">The page you're looking for doesn't exist or hasn't been published yet.</p>
    ${siteId ? `<a href="/site/${siteId}">Go to homepage</a>` : ''}
  </div>
</body>
</html>`;
}

export default router;
