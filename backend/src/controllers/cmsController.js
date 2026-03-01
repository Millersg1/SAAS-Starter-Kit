import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getBrandMember } from '../models/brandModel.js';
import * as cmsModel from '../models/cmsModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imagesDir),
  filename: (req, file, cb) => {
    const base = `cms-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg' };
    cb(null, `${base}${extMap[file.mimetype] || '.jpg'}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    cb(null, allowed.includes(file.mimetype));
  }
});

const requireMember = async (brandId, userId) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) throw Object.assign(new Error('Access denied'), { status: 403 });
};

// ── Sites ─────────────────────────────────────────────────────────────────────

export const listSites = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const sites = await cmsModel.getSites(brandId);
    res.json({ success: true, data: sites });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const createSite = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const site = await cmsModel.createSite({ ...req.body, brand_id: brandId });
    res.status(201).json({ success: true, data: site });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const getSite = async (req, res) => {
  try {
    const { brandId, siteId } = req.params;
    await requireMember(brandId, req.user.id);
    const site = await cmsModel.getSiteById(siteId, brandId);
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
    res.json({ success: true, data: site });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const updateSite = async (req, res) => {
  try {
    const { brandId, siteId } = req.params;
    await requireMember(brandId, req.user.id);
    const site = await cmsModel.updateSite(siteId, req.body);
    res.json({ success: true, data: site });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const deleteSite = async (req, res) => {
  try {
    const { brandId, siteId } = req.params;
    await requireMember(brandId, req.user.id);
    await cmsModel.deleteSite(siteId, brandId);
    res.json({ success: true, message: 'Site deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── Pages ─────────────────────────────────────────────────────────────────────

export const listPages = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const { site_id, type, status, search, limit, offset } = req.query;
    const pages = await cmsModel.getPages(brandId, {
      siteId: site_id, type, status, search,
      limit: parseInt(limit) || 50, offset: parseInt(offset) || 0
    });
    res.json({ success: true, data: pages });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const createPage = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const page = await cmsModel.createPage({ ...req.body, brand_id: brandId, author_id: req.user.id });
    res.status(201).json({ success: true, data: page });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'A page with this slug already exists for this site' });
    }
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const getPage = async (req, res) => {
  try {
    const { brandId, pageId } = req.params;
    await requireMember(brandId, req.user.id);
    const page = await cmsModel.getPageById(pageId, brandId);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const updatePage = async (req, res) => {
  try {
    const { brandId, pageId } = req.params;
    await requireMember(brandId, req.user.id);
    const page = await cmsModel.updatePage(pageId, req.body);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const deletePage = async (req, res) => {
  try {
    const { brandId, pageId } = req.params;
    await requireMember(brandId, req.user.id);
    await cmsModel.deletePage(pageId, brandId);
    res.json({ success: true, message: 'Page deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── Media ─────────────────────────────────────────────────────────────────────

export const listMedia = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const media = await cmsModel.getMedia(brandId, req.query.site_id);
    res.json({ success: true, data: media });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const uploadMedia = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const fileUrl = `/images/${req.file.filename}`;
    const record = await cmsModel.createMediaRecord({
      brand_id: brandId,
      site_id: req.body.site_id || null,
      filename: req.file.filename,
      original_name: req.file.originalname,
      file_url: fileUrl,
      file_type: 'image',
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      alt_text: req.body.alt_text || null,
      uploaded_by: req.user.id
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const deleteMedia = async (req, res) => {
  try {
    const { brandId, mediaId } = req.params;
    await requireMember(brandId, req.user.id);
    const media = await cmsModel.getMediaById(mediaId, brandId);
    if (!media) return res.status(404).json({ success: false, message: 'Media not found' });
    // Delete file from disk
    const filePath = path.join(imagesDir, path.basename(media.file_url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await cmsModel.deleteMedia(mediaId, brandId);
    res.json({ success: true, message: 'Media deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── Version History ───────────────────────────────────────────────────────────

export const listVersions = async (req, res) => {
  try {
    const { brandId, pageId } = req.params;
    await requireMember(brandId, req.user.id);
    const versions = await cmsModel.getPageVersions(pageId, brandId);
    res.json({ success: true, data: versions });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const restoreVersion = async (req, res) => {
  try {
    const { brandId, pageId, versionId } = req.params;
    await requireMember(brandId, req.user.id);
    const version = await cmsModel.getPageVersionById(versionId, brandId);
    if (!version || version.page_id !== pageId) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }
    // Snapshot current before overwriting
    const current = await cmsModel.getPageById(pageId, brandId);
    if (current) {
      await cmsModel.savePageVersion(current, req.user.name || 'auto');
    }
    // Restore the selected version fields
    const restored = await cmsModel.updatePage(pageId, {
      title: version.title,
      content: version.content,
      excerpt: version.excerpt,
      seo_title: version.seo_title,
      seo_description: version.seo_description,
      seo_keywords: version.seo_keywords,
    });
    res.json({ success: true, data: restored });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── Content Review ────────────────────────────────────────────────────────────

export const sendPageForReview = async (req, res) => {
  try {
    const { brandId, pageId } = req.params;
    await requireMember(brandId, req.user.id);
    const tokenRow = await cmsModel.resetPageReviewToken(pageId, brandId);
    if (!tokenRow) return res.status(404).json({ success: false, message: 'Page not found' });
    const reviewUrl = `${process.env.FRONTEND_URL || ''}/review/cms/${tokenRow.review_token}`;
    res.json({ success: true, data: { review_token: tokenRow.review_token, review_url: reviewUrl } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// Public — no auth required
export const publicGetPageForReview = async (req, res) => {
  try {
    const { token } = req.params;
    const page = await cmsModel.getPageByReviewToken(token);
    if (!page) return res.status(404).json({ success: false, message: 'Review link not found or expired' });
    res.json({ success: true, data: page });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Public — no auth required
export const publicSubmitPageReview = async (req, res) => {
  try {
    const { token } = req.params;
    const { review_status, review_notes, reviewer_name } = req.body;
    if (!['approved', 'changes_requested'].includes(review_status)) {
      return res.status(400).json({ success: false, message: 'Invalid review_status' });
    }
    const page = await cmsModel.updatePageReview(token, { review_status, review_notes, reviewer_name });
    if (!page) return res.status(404).json({ success: false, message: 'Review link not found' });
    res.json({ success: true, data: { review_status: page.review_status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── AI Content Generation ─────────────────────────────────────────────────────

export const generateContent = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const { title, keywords, pageType = 'page', tone = 'professional' } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    // Forward to AI controller pattern — uses process.env.OPENAI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(503).json({ success: false, message: 'AI service not configured. Set OPENAI_API_KEY.' });
    }

    const axios = (await import('axios')).default;
    const prompt = `Write a ${pageType} titled "${title}"${keywords ? ` about: ${keywords}` : ''}. Tone: ${tone}.
Return ONLY valid JSON with these fields:
{
  "content": "<p>HTML body content using only h2, h3, p, ul, li, strong, em tags. At least 300 words.</p>",
  "seoTitle": "SEO title under 60 chars",
  "seoDescription": "Meta description under 155 chars"
}`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    }, { headers: { Authorization: `Bearer ${openaiKey}` } });

    const result = JSON.parse(response.data.choices[0].message.content);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};
