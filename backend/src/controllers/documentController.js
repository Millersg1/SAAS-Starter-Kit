import * as documentModel from '../models/documentModel.js';
import * as brandModel from '../models/brandModel.js';
import { getFileInfo, deleteFile } from '../middleware/uploadMiddleware.js';

/**
 * Upload/Create a new document
 */
export const uploadDocument = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'No file uploaded'
      });
    }

    // Get file info
    const fileInfo = getFileInfo(req.file);

    // Prepare document data
    const documentData = {
      brand_id: brandId,
      project_id: req.body.project_id || null,
      client_id: req.body.client_id || null,
      name: req.body.name || fileInfo.file_name,
      description: req.body.description || null,
      ...fileInfo,
      category: req.body.category || 'general',
      visibility: req.body.visibility || 'private',
      is_client_visible: req.body.is_client_visible === 'true' || req.body.is_client_visible === true,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      custom_fields: req.body.custom_fields ? JSON.parse(req.body.custom_fields) : {},
      uploaded_by: userId
    };

    // Create document
    const document = await documentModel.createDocument(documentData);

    res.status(201).json({
      status: 'success',
      message: 'Document uploaded successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Error uploading document:  documentController.js:58 - documentController-fixed.js:58', error);
    
    // Delete uploaded file if database operation failed
    if (req.file) {
      deleteFile(req.file.path);
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to upload document',
      error: error.message
    });
  }
};

/**
 * Get all documents for a brand
 */
export const getBrandDocuments = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Get filters from query params
    const filters = {
      project_id: req.query.project_id,
      client_id: req.query.client_id,
      category: req.query.category,
      status: req.query.status,
      visibility: req.query.visibility,
      file_type: req.query.file_type,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const documents = await documentModel.getBrandDocuments(brandId, filters);

    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: { documents }
    });
  } catch (error) {
    console.error('Error getting brand documents:  documentController.js:111 - documentController-fixed.js:111', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve documents',
      error: error.message
    });
  }
};

/**
 * Get single document by ID
 */
export const getDocument = async (req, res) => {
  try {
    const { brandId, documentId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const document = await documentModel.getDocumentById(documentId);

    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found'
      });
    }

    // Verify document belongs to brand
    if (document.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Document does not belong to this brand'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { document }
    });
  } catch (error) {
    console.error('Error getting document:  documentController.js:159 - documentController-fixed.js:159', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve document',
      error: error.message
    });
  }
};

/**
 * Update document metadata
 */
export const updateDocument = async (req, res) => {
  try {
    const { brandId, documentId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if document exists and belongs to brand
    const existingDoc = await documentModel.getDocumentById(documentId);
    if (!existingDoc) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found'
      });
    }

    if (existingDoc.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Document does not belong to this brand'
      });
    }

    const document = await documentModel.updateDocument(documentId, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Document updated successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Error updating document:  documentController.js:209 - documentController-fixed.js:209', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update document',
      error: error.message
    });
  }
};

/**
 * Delete document (soft delete)
 */
export const deleteDocument = async (req, res) => {
  try {
    const { brandId, documentId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if document exists and belongs to brand
    const existingDoc = await documentModel.getDocumentById(documentId);
    if (!existingDoc) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found'
      });
    }

    if (existingDoc.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Document does not belong to this brand'
      });
    }

    await documentModel.deleteDocument(documentId);

    res.status(200).json({
      status: 'success',
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:  documentController.js:258 - documentController-fixed.js:258', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete document',
      error: error.message
    });
  }
};

/**
 * Download document
 */
export const downloadDocument = async (req, res) => {
  try {
    const { brandId, documentId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const document = await documentModel.getDocumentById(documentId);

    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found'
      });
    }

    if (document.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Document does not belong to this brand'
      });
    }

    // Track download
    await documentModel.trackDownload(documentId, userId);

    // Send file
    res.download(document.file_path, document.file_name);
  } catch (error) {
    console.error('Error downloading document:  documentController.js:306 - documentController-fixed.js:306', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download document',
      error: error.message
    });
  }
};

/**
 * Get document statistics
 */
export const getDocumentStats = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const stats = await documentModel.getDocumentStats(brandId);

    res.status(200).json({
      status: 'success',
      data: { stats }
    });
  } catch (error) {
    console.error('Error getting document stats:  documentController.js:339 - documentController-fixed.js:339', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve document statistics',
      error: error.message
    });
  }
};

/**
 * Get project documents
 */
export const getProjectDocuments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const documents = await documentModel.getProjectDocuments(projectId);

    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: { documents }
    });
  } catch (error) {
    console.error('Error getting project documents:  documentController.js:364 - documentController-fixed.js:364', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve project documents',
      error: error.message
    });
  }
};

/**
 * Get client documents
 */
export const getClientDocuments = async (req, res) => {
  try {
    const { clientId } = req.params;
    const userId = req.user.id;

    const documents = await documentModel.getClientDocuments(clientId);

    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: { documents }
    });
  } catch (error) {
    console.error('Error getting client documents:  documentController.js:389 - documentController-fixed.js:389', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve client documents',
      error: error.message
    });
  }
};

// ============= DOCUMENT SHARING =============

/**
 * Share document with user or client
 */
export const shareDocument = async (req, res) => {
  try {
    const { brandId, documentId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if document exists and belongs to brand
    const document = await documentModel.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found'
      });
    }

    if (document.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Document does not belong to this brand'
      });
    }

    const shareData = {
      document_id: documentId,
      shared_with_user_id: req.body.shared_with_user_id,
      shared_with_client_id: req.body.shared_with_client_id,
      permission: req.body.permission,
      can_reshare: req.body.can_reshare,
      expires_at: req.body.expires_at,
      shared_by: userId
    };

    const share = await documentModel.shareDocument(shareData);

    res.status(201).json({
      status: 'success',
      message: 'Document shared successfully',
      data: { share }
    });
  } catch (error) {
    console.error('Error sharing document:  documentController.js:451 - documentController-fixed.js:451', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to share document',
      error: error.message
    });
  }
};

/**
 * Get document shares
 */
export const getDocumentShares = async (req, res) => {
  try {
    const { brandId, documentId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const shares = await documentModel.getDocumentShares(documentId);

    res.status(200).json({
      status: 'success',
      results: shares.length,
      data: { shares }
    });
  } catch (error) {
    console.error('Error getting document shares:  documentController.js:485 - documentController-fixed.js:485', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve document shares',
      error: error.message
    });
  }
};

/**
 * Update document share
 */
export const updateDocumentShare = async (req, res) => {
  try {
    const { brandId, documentId, shareId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const share = await documentModel.updateDocumentShare(shareId, req.body);

    if (!share) {
      return res.status(404).json({
        status: 'fail',
        message: 'Share not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Share updated successfully',
      data: { share }
    });
  } catch (error) {
    console.error('Error updating document share:  documentController.js:526 - documentController-fixed.js:526', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update share',
      error: error.message
    });
  }
};

/**
 * Delete document share
 */
export const deleteDocumentShare = async (req, res) => {
  try {
    const { brandId, documentId, shareId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    await documentModel.deleteDocumentShare(shareId);

    res.status(200).json({
      status: 'success',
      message: 'Share deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document share:  documentController.js:559 - documentController-fixed.js:559', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete share',
      error: error.message
    });
  }
};

// ============= DOCUMENT VERSIONS =============

/**
 * Create new document version
 */
export const createDocumentVersion = async (req, res) => {
  try {
    const { brandId, documentId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'No file uploaded'
      });
    }

    // Get existing document
    const document = await documentModel.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found'
      });
    }

    if (document.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Document does not belong to this brand'
      });
    }

    // Get file info
    const fileInfo = getFileInfo(req.file);

    // Create version
    const versionData = {
      document_id: documentId,
      version_number: document.version + 1,
      file_name: fileInfo.file_name,
      file_path: fileInfo.file_path,
      file_size: fileInfo.file_size,
      change_description: req.body.change_description || '',
      uploaded_by: userId
    };

    const version = await documentModel.createDocumentVersion(versionData);

    // Update document version number
    await documentModel.updateDocument(documentId, {
      version: document.version + 1
    });

    res.status(201).json({
      status: 'success',
      message: 'Document version created successfully',
      data: { version }
    });
  } catch (error) {
    console.error('Error creating document version:  documentController.js:638 - documentController-fixed.js:638', error);
    
    // Delete uploaded file if database operation failed
    if (req.file) {
      deleteFile(req.file.path);
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create document version',
      error: error.message
    });
  }
};

/**
 * Get document version history
 */
export const getDocumentVersions = async (req, res) => {
  try {
    const { brandId, documentId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const versions = await documentModel.getDocumentVersions(documentId);

    res.status(200).json({
      status: 'success',
      results: versions.length,
      data: { versions }
    });
  } catch (error) {
    console.error('Error getting document versions:  documentController.js:678 - documentController-fixed.js:678', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve document versions',
      error: error.message
    });
  }
};

/**
 * Get specific document version
 */
export const getDocumentVersion = async (req, res) => {
  try {
    const { brandId, documentId, versionId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const version = await documentModel.getDocumentVersion(versionId);

    if (!version) {
      return res.status(404).json({
        status: 'fail',
        message: 'Version not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { version }
    });
  } catch (error) {
    console.error('Error getting document version:  documentController.js:718 - documentController-fixed.js:718', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve document version',
      error: error.message
    });
  }
};
