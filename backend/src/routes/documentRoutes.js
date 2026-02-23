import express from 'express';
import * as documentController from '../controllers/documentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadSingle, handleUploadError } from '../middleware/uploadMiddleware.js';
import { validate } from '../utils/validators.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  shareDocumentSchema,
  updateDocumentShareSchema,
  createDocumentVersionSchema
} from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============= DOCUMENT ROUTES =============

// Upload document (with file upload)
router.post(
  '/:brandId/upload',
  uploadSingle,
  handleUploadError,
  documentController.uploadDocument
);

// Get all documents for a brand (with filters)
router.get(
  '/:brandId',
  documentController.getBrandDocuments
);

// Get document statistics
router.get(
  '/:brandId/stats',
  documentController.getDocumentStats
);

// Get single document
router.get(
  '/:brandId/:documentId',
  documentController.getDocument
);

// Update document metadata
router.patch(
  '/:brandId/:documentId',
  validate(updateDocumentSchema),
  documentController.updateDocument
);

// Delete document
router.delete(
  '/:brandId/:documentId',
  documentController.deleteDocument
);

// Download document
router.get(
  '/:brandId/:documentId/download',
  documentController.downloadDocument
);

// ============= PROJECT & CLIENT DOCUMENT ROUTES =============

// Get project documents
router.get(
  '/project/:projectId',
  documentController.getProjectDocuments
);

// Get client documents
router.get(
  '/client/:clientId',
  documentController.getClientDocuments
);

// ============= DOCUMENT SHARING ROUTES =============

// Share document
router.post(
  '/:brandId/:documentId/share',
  validate(shareDocumentSchema),
  documentController.shareDocument
);

// Get document shares
router.get(
  '/:brandId/:documentId/shares',
  documentController.getDocumentShares
);

// Update document share
router.patch(
  '/:brandId/:documentId/shares/:shareId',
  validate(updateDocumentShareSchema),
  documentController.updateDocumentShare
);

// Delete document share
router.delete(
  '/:brandId/:documentId/shares/:shareId',
  documentController.deleteDocumentShare
);

// ============= DOCUMENT VERSION ROUTES =============

// Create new document version (with file upload)
router.post(
  '/:brandId/:documentId/versions',
  uploadSingle,
  handleUploadError,
  documentController.createDocumentVersion
);

// Get document version history
router.get(
  '/:brandId/:documentId/versions',
  documentController.getDocumentVersions
);

// Get specific document version
router.get(
  '/:brandId/:documentId/versions/:versionId',
  documentController.getDocumentVersion
);

export default router;
