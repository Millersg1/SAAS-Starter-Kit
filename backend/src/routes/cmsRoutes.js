import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as cmsController from '../controllers/cmsController.js';
import { PAGE_TEMPLATES, getTemplateById, getTemplatesByCategory } from '../utils/pageTemplates.js';

const router = express.Router();

// ── Public review routes (no auth) ───────────────────────────────────────────
router.get('/review/:token',  cmsController.publicGetPageForReview);
router.post('/review/:token', cmsController.publicSubmitPageReview);

// ── Page templates (no auth needed — just template data) ─────────────────────
router.get('/templates', (req, res) => {
  const { category } = req.query;
  const templates = getTemplatesByCategory(category);
  res.json({
    status: 'success',
    data: { templates: templates.map(({ id, name, category, description }) => ({ id, name, category, description })) },
  });
});
router.get('/templates/:templateId', (req, res) => {
  const template = getTemplateById(req.params.templateId);
  if (!template) return res.status(404).json({ status: 'fail', message: 'Template not found' });
  res.json({ status: 'success', data: { template } });
});

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(protect);

// Sites
router.get('/:brandId/sites',             cmsController.listSites);
router.post('/:brandId/sites',            cmsController.createSite);
router.get('/:brandId/sites/:siteId',     cmsController.getSite);
router.patch('/:brandId/sites/:siteId',   cmsController.updateSite);
router.delete('/:brandId/sites/:siteId',  cmsController.deleteSite);

// Pages
router.get('/:brandId/pages',             cmsController.listPages);
router.post('/:brandId/pages',            cmsController.createPage);
router.get('/:brandId/pages/:pageId',     cmsController.getPage);
router.patch('/:brandId/pages/:pageId',   cmsController.updatePage);
router.delete('/:brandId/pages/:pageId',  cmsController.deletePage);

// Page version history
router.get('/:brandId/pages/:pageId/versions',                   cmsController.listVersions);
router.post('/:brandId/pages/:pageId/versions/:versionId/restore', cmsController.restoreVersion);

// Page review (send for review + check status)
router.post('/:brandId/pages/:pageId/send-for-review', cmsController.sendPageForReview);

// Media
router.get('/:brandId/media',             cmsController.listMedia);
router.post('/:brandId/media',            cmsController.upload.single('file'), cmsController.uploadMedia);
router.delete('/:brandId/media/:mediaId', cmsController.deleteMedia);

// AI content generation
router.post('/:brandId/ai-content',       cmsController.generateContent);

export default router;
