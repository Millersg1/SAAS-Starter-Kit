import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/knowledgeBaseController.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

router.get('/public/:brandId/categories', ctrl.listPublicCategories);
router.get('/public/:brandId/articles', ctrl.listPublicArticles);
router.get('/public/:brandId/articles/:slug', ctrl.getPublicArticleBySlug);
router.post('/public/:brandId/articles/:articleId/feedback', ctrl.submitArticleFeedback);

// ============================================
// PROTECTED ROUTES (auth required)
// ============================================

router.use(protect);

router.get('/:brandId/categories', ctrl.listCategories);
router.post('/:brandId/categories', ctrl.createCategory);
router.patch('/:brandId/categories/:categoryId', ctrl.updateCategory);
router.delete('/:brandId/categories/:categoryId', ctrl.deleteCategory);
router.get('/:brandId/articles', ctrl.listArticles);
router.post('/:brandId/articles', ctrl.createArticle);
router.get('/:brandId/articles/:articleId', ctrl.getArticle);
router.patch('/:brandId/articles/:articleId', ctrl.updateArticle);
router.delete('/:brandId/articles/:articleId', ctrl.deleteArticle);
router.get('/:brandId/stats', ctrl.getStats);

export default router;
