import { query } from '../config/database.js';

/**
 * Upload/Create a new document
 */
export const createDocument = async (documentData) => {
  const {
    brand_id,
    project_id,
    client_id,
    name,
    description,
    file_name,
    file_path,
    file_size,
    file_type,
    file_extension,
    category,
    visibility,
    is_client_visible,
    tags,
    custom_fields,
    uploaded_by
  } = documentData;

  const result = await query(
    `INSERT INTO documents (
      brand_id, project_id, client_id, name, description,
      file_name, file_path, file_size, file_type, file_extension,
      category, visibility, is_client_visible, tags, custom_fields, uploaded_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id, brand_id, project_id, client_id, name, description,
              file_name, file_path, file_size, file_type, file_extension,
              category, status, version, is_latest_version, visibility,
              is_client_visible, download_count, tags, custom_fields,
              uploaded_by, is_active, created_at, updated_at`,
    [
      brand_id, project_id, client_id, name, description,
      file_name, file_path, file_size, file_type, file_extension,
      category, visibility, is_client_visible !== undefined ? is_client_visible : false,
      JSON.stringify(tags || []),
      JSON.stringify(custom_fields || {}),
      uploaded_by
    ]
  );

  return result.rows[0];
};

/**
 * Get all documents for a brand with optional filters
 */
export const getBrandDocuments = async (brandId, filters = {}) => {
  const {
    project_id,
    client_id,
    category,
    status,
    visibility,
    file_type,
    search,
    limit = 50,
    offset = 0
  } = filters;

  let queryText = `
    SELECT d.id, d.brand_id, d.project_id, d.client_id, d.name, d.description,
           d.file_name, d.file_path, d.file_size, d.file_type, d.file_extension,
           d.category, d.status, d.version, d.is_latest_version, d.parent_document_id,
           d.visibility, d.is_client_visible, d.download_count, d.last_downloaded_at,
           d.tags, d.custom_fields, d.uploaded_by, d.is_active,
           d.created_at, d.updated_at,
           p.name as project_name,
           c.name as client_name,
           u.name as uploaded_by_name, u.email as uploaded_by_email
    FROM documents d
    LEFT JOIN projects p ON d.project_id = p.id
    LEFT JOIN clients c ON d.client_id = c.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.brand_id = $1 AND d.is_active = TRUE
  `;

  const params = [brandId];
  let paramCount = 1;

  if (project_id) {
    paramCount++;
    queryText += ` AND d.project_id = $${paramCount}`;
    params.push(project_id);
  }

  if (client_id) {
    paramCount++;
    queryText += ` AND d.client_id = $${paramCount}`;
    params.push(client_id);
  }

  if (category) {
    paramCount++;
    queryText += ` AND d.category = $${paramCount}`;
    params.push(category);
  }

  if (status) {
    paramCount++;
    queryText += ` AND d.status = $${paramCount}`;
    params.push(status);
  }

  if (visibility) {
    paramCount++;
    queryText += ` AND d.visibility = $${paramCount}`;
    params.push(visibility);
  }

  if (file_type) {
    paramCount++;
    queryText += ` AND d.file_type LIKE $${paramCount}`;
    params.push(`%${file_type}%`);
  }

  if (search) {
    const s = `%${search}%`;
    queryText += ` AND (d.name ILIKE $${paramCount + 1} OR d.description ILIKE $${paramCount + 2} OR d.file_name ILIKE $${paramCount + 3})`;
    params.push(s, s, s);
    paramCount += 3;
  }

  queryText += ` ORDER BY d.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Get document by ID with related data
 */
export const getDocumentById = async (documentId) => {
  const result = await query(
    `SELECT d.id, d.brand_id, d.project_id, d.client_id, d.name, d.description,
            d.file_name, d.file_path, d.file_size, d.file_type, d.file_extension,
            d.category, d.status, d.version, d.is_latest_version, d.parent_document_id,
            d.visibility, d.is_client_visible, d.password_protected,
            d.download_count, d.last_downloaded_at, d.last_downloaded_by,
            d.tags, d.custom_fields, d.uploaded_by, d.is_active,
            d.created_at, d.updated_at,
            p.name as project_name,
            c.name as client_name, c.email as client_email,
            u.name as uploaded_by_name, u.email as uploaded_by_email,
            dl.name as last_downloaded_by_name
     FROM documents d
     LEFT JOIN projects p ON d.project_id = p.id
     LEFT JOIN clients c ON d.client_id = c.id
     LEFT JOIN users u ON d.uploaded_by = u.id
     LEFT JOIN users dl ON d.last_downloaded_by = dl.id
     WHERE d.id = $1 AND d.is_active = TRUE`,
    [documentId]
  );

  return result.rows[0];
};

/**
 * Update document metadata
 */
export const updateDocument = async (documentId, updateData) => {
  const allowedFields = [
    'name', 'description', 'category', 'status', 'visibility',
    'is_client_visible', 'tags', 'custom_fields'
  ];

  const updates = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updateData)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = $${paramCount}`);
      // Convert arrays and objects to JSON strings for JSONB fields
      if (key === 'tags' && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else if (key === 'custom_fields' && typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
      paramCount++;
    }
  }

  if (updates.length === 0) {
    return null;
  }

  values.push(documentId);

  const result = await query(
    `UPDATE documents
     SET ${updates.join(', ')}
     WHERE id = $${paramCount} AND is_active = TRUE
     RETURNING id, brand_id, project_id, client_id, name, description,
               file_name, file_size, file_type, file_extension,
               category, status, version, visibility, is_client_visible,
               tags, custom_fields, uploaded_by, created_at, updated_at`,
    values
  );

  return result.rows[0];
};

/**
 * Delete document (soft delete)
 */
export const deleteDocument = async (documentId) => {
  const result = await query(
    `UPDATE documents
     SET is_active = FALSE, status = 'deleted', deleted_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id`,
    [documentId]
  );

  return result.rows[0];
};

/**
 * Track document download
 */
export const trackDownload = async (documentId, userId) => {
  const result = await query(
    `UPDATE documents
     SET download_count = download_count + 1,
         last_downloaded_at = CURRENT_TIMESTAMP,
         last_downloaded_by = $2
     WHERE id = $1
     RETURNING id, download_count, last_downloaded_at`,
    [documentId, userId]
  );

  return result.rows[0];
};

/**
 * Get document statistics for a brand
 */
export const getDocumentStats = async (brandId) => {
  const result = await query(
    `SELECT 
      COUNT(*) as total_documents,
      COUNT(*) FILTER (WHERE category = 'contract') as contract_documents,
      COUNT(*) FILTER (WHERE category = 'invoice') as invoice_documents,
      COUNT(*) FILTER (WHERE category = 'proposal') as proposal_documents,
      COUNT(*) FILTER (WHERE category = 'report') as report_documents,
      COUNT(*) FILTER (WHERE category = 'design') as design_documents,
      COUNT(*) FILTER (WHERE status = 'active') as active_documents,
      COUNT(*) FILTER (WHERE status = 'archived') as archived_documents,
      COUNT(*) FILTER (WHERE is_client_visible = TRUE) as client_visible_documents,
      SUM(file_size) as total_storage_bytes,
      SUM(download_count) as total_downloads,
      AVG(download_count) as avg_downloads_per_document
     FROM documents
     WHERE brand_id = $1 AND is_active = TRUE`,
    [brandId]
  );

  const stats = result.rows[0];
  
  return {
    total_documents: parseInt(stats.total_documents) || 0,
    contract_documents: parseInt(stats.contract_documents) || 0,
    invoice_documents: parseInt(stats.invoice_documents) || 0,
    proposal_documents: parseInt(stats.proposal_documents) || 0,
    report_documents: parseInt(stats.report_documents) || 0,
    design_documents: parseInt(stats.design_documents) || 0,
    active_documents: parseInt(stats.active_documents) || 0,
    archived_documents: parseInt(stats.archived_documents) || 0,
    client_visible_documents: parseInt(stats.client_visible_documents) || 0,
    total_storage_bytes: parseInt(stats.total_storage_bytes) || 0,
    total_storage_mb: parseFloat((parseInt(stats.total_storage_bytes) || 0) / (1024 * 1024)).toFixed(2),
    total_downloads: parseInt(stats.total_downloads) || 0,
    avg_downloads_per_document: parseFloat(stats.avg_downloads_per_document) || 0
  };
};

/**
 * Get project documents
 */
export const getProjectDocuments = async (projectId) => {
  const result = await query(
    `SELECT d.id, d.name, d.description, d.file_name, d.file_size,
            d.file_type, d.file_extension, d.category, d.status,
            d.visibility, d.is_client_visible, d.download_count,
            d.tags, d.created_at, d.updated_at,
            u.name as uploaded_by_name, u.email as uploaded_by_email
     FROM documents d
     LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE d.project_id = $1 AND d.is_active = TRUE
     ORDER BY d.created_at DESC`,
    [projectId]
  );

  return result.rows;
};

/**
 * Get client documents
 */
export const getClientDocuments = async (clientId) => {
  const result = await query(
    `SELECT d.id, d.name, d.description, d.file_name, d.file_size,
            d.file_type, d.file_extension, d.category, d.status,
            d.download_count, d.tags, d.created_at, d.updated_at,
            p.name as project_name,
            u.name as uploaded_by_name
     FROM documents d
     LEFT JOIN projects p ON d.project_id = p.id
     LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE d.client_id = $1 AND d.is_client_visible = TRUE AND d.is_active = TRUE
     ORDER BY d.created_at DESC`,
    [clientId]
  );

  return result.rows;
};

// ============= DOCUMENT SHARING =============

/**
 * Share document with user or client
 */
export const shareDocument = async (shareData) => {
  const {
    document_id,
    shared_with_user_id,
    shared_with_client_id,
    permission,
    can_reshare,
    expires_at,
    shared_by
  } = shareData;

  const result = await query(
    `INSERT INTO document_shares (
      document_id, shared_with_user_id, shared_with_client_id,
      permission, can_reshare, expires_at, shared_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, document_id, shared_with_user_id, shared_with_client_id,
              permission, can_reshare, expires_at, accessed_count,
              shared_by, created_at, updated_at`,
    [
      document_id,
      shared_with_user_id || null,
      shared_with_client_id || null,
      permission || 'view',
      can_reshare !== undefined ? can_reshare : false,
      expires_at || null,
      shared_by
    ]
  );

  return result.rows[0];
};

/**
 * Get document shares
 */
export const getDocumentShares = async (documentId) => {
  const result = await query(
    `SELECT ds.id, ds.document_id, ds.shared_with_user_id, ds.shared_with_client_id,
            ds.permission, ds.can_reshare, ds.expires_at, ds.accessed_count,
            ds.last_accessed_at, ds.shared_by, ds.created_at, ds.updated_at,
            u.name as shared_with_user_name, u.email as shared_with_user_email,
            c.name as shared_with_client_name, c.email as shared_with_client_email,
            sharer.name as shared_by_name, sharer.email as shared_by_email
     FROM document_shares ds
     LEFT JOIN users u ON ds.shared_with_user_id = u.id
     LEFT JOIN clients c ON ds.shared_with_client_id = c.id
     LEFT JOIN users sharer ON ds.shared_by = sharer.id
     WHERE ds.document_id = $1
     ORDER BY ds.created_at DESC`,
    [documentId]
  );

  return result.rows;
};

/**
 * Update document share
 */
export const updateDocumentShare = async (shareId, updateData) => {
  const allowedFields = ['permission', 'can_reshare', 'expires_at'];

  const updates = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updateData)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  if (updates.length === 0) {
    return null;
  }

  values.push(shareId);

  const result = await query(
    `UPDATE document_shares
     SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING id, document_id, shared_with_user_id, shared_with_client_id,
               permission, can_reshare, expires_at, created_at, updated_at`,
    values
  );

  return result.rows[0];
};

/**
 * Delete document share
 */
export const deleteDocumentShare = async (shareId) => {
  const result = await query(
    `DELETE FROM document_shares
     WHERE id = $1
     RETURNING id`,
    [shareId]
  );

  return result.rows[0];
};

/**
 * Track share access
 */
export const trackShareAccess = async (shareId) => {
  const result = await query(
    `UPDATE document_shares
     SET accessed_count = accessed_count + 1,
         last_accessed_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, accessed_count, last_accessed_at`,
    [shareId]
  );

  return result.rows[0];
};

// ============= DOCUMENT VERSIONS =============

/**
 * Create new document version
 */
export const createDocumentVersion = async (versionData) => {
  const {
    document_id,
    version_number,
    file_name,
    file_path,
    file_size,
    change_description,
    uploaded_by
  } = versionData;

  const result = await query(
    `INSERT INTO document_versions (
      document_id, version_number, file_name, file_path,
      file_size, change_description, uploaded_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, document_id, version_number, file_name, file_path,
              file_size, change_description, uploaded_by, created_at`,
    [document_id, version_number, file_name, file_path, file_size, change_description, uploaded_by]
  );

  return result.rows[0];
};

/**
 * Get document version history
 */
export const getDocumentVersions = async (documentId) => {
  const result = await query(
    `SELECT dv.id, dv.document_id, dv.version_number, dv.file_name,
            dv.file_path, dv.file_size, dv.change_description,
            dv.uploaded_by, dv.created_at,
            u.name as uploaded_by_name, u.email as uploaded_by_email
     FROM document_versions dv
     LEFT JOIN users u ON dv.uploaded_by = u.id
     WHERE dv.document_id = $1
     ORDER BY dv.version_number DESC`,
    [documentId]
  );

  return result.rows;
};

/**
 * Get specific document version
 */
export const getDocumentVersion = async (versionId) => {
  const result = await query(
    `SELECT dv.id, dv.document_id, dv.version_number, dv.file_name,
            dv.file_path, dv.file_size, dv.change_description,
            dv.uploaded_by, dv.created_at,
            u.name as uploaded_by_name, u.email as uploaded_by_email
     FROM document_versions dv
     LEFT JOIN users u ON dv.uploaded_by = u.id
     WHERE dv.id = $1`,
    [versionId]
  );

  return result.rows[0];
};
