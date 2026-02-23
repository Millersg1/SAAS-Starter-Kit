import { query } from '../config/database.js';

/**
 * Advanced Search - Search across all entities
 */
export const globalSearch = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { q, type, limit = 20, offset = 0 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchTerm = `%${q}%`;
    const results = {
      clients: [],
      projects: [],
      documents: [],
      messages: [],
      invoices: []
    };

    // Search clients if no type specified or type is 'clients'
    if (!type || type === 'clients') {
      const clientsResult = await query(
        `SELECT id, name, email, phone, company, 'client' as type
         FROM clients 
         WHERE brand_id = $1 
           AND is_active = TRUE
           AND (name ILIKE $2 OR email ILIKE $2 OR company ILIKE $2 OR phone ILIKE $2)
         ORDER BY name ASC
         LIMIT $3`,
        [brandId, searchTerm, limit]
      );
      results.clients = clientsResult.rows;
    }

    // Search projects if no type specified or type is 'projects'
    if (!type || type === 'projects') {
      const projectsResult = await query(
        `SELECT p.id, p.name, p.description, p.status, 'project' as type,
                c.name as client_name
         FROM projects p
         LEFT JOIN clients c ON p.client_id = c.id
         WHERE p.brand_id = $1 
           AND p.status != 'archived'
           AND (p.name ILIKE $2 OR p.description ILIKE $2)
         ORDER BY p.name ASC
         LIMIT $3`,
        [brandId, searchTerm, limit]
      );
      results.projects = projectsResult.rows;
    }

    // Search documents if no type specified or type is 'documents'
    if (!type || type === 'documents') {
      const documentsResult = await query(
        `SELECT id, name, file_type, 'document' as type
         FROM documents 
         WHERE brand_id = $1 
           AND is_active = TRUE
           AND name ILIKE $2
         ORDER BY name ASC
         LIMIT $3`,
        [brandId, searchTerm, limit]
      );
      results.documents = documentsResult.rows;
    }

    // Search messages if no type specified or type is 'messages'
    if (!type || type === 'messages') {
      const messagesResult = await query(
        `SELECT m.id, m.subject, m.content, 'message' as type,
                m.client_id, m.project_id
         FROM messages m
         WHERE m.brand_id = $1 
           AND m.status = 'active'
           AND (m.subject ILIKE $2 OR m.content ILIKE $2)
         ORDER BY m.created_at DESC
         LIMIT $3`,
        [brandId, searchTerm, limit]
      );
      results.messages = messagesResult.rows;
    }

    // Search invoices if no type specified or type is 'invoices'
    if (!type || type === 'invoices') {
      const invoicesResult = await query(
        `SELECT i.id, i.invoice_number, i.amount, i.status, 'invoice' as type,
                c.name as client_name
         FROM invoices i
         LEFT JOIN clients c ON i.client_id = c.id
         WHERE i.brand_id = $1 
           AND (i.invoice_number ILIKE $2 OR CAST(i.amount AS TEXT) ILIKE $2)
         ORDER BY i.created_at DESC
         LIMIT $3`,
        [brandId, searchTerm, limit]
      );
      results.invoices = invoicesResult.rows;
    }

    // Calculate total results
    const totalResults = 
      results.clients.length + 
      results.projects.length + 
      results.documents.length + 
      results.messages.length + 
      results.invoices.length;

    res.status(200).json({
      success: true,
      data: {
        query: q,
        total: totalResults,
        results
      }
    });
  } catch (error) {
    console.error('Error in global search: - searchController.js:123', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
};

/**
 * Get search suggestions (autocomplete)
 */
export const getSearchSuggestions = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { q, limit = 5 } = req.query;

    if (!q || q.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchTerm = `%${q}%`;
    const suggestions = [];

    // Get client suggestions
    const clientsResult = await query(
      `SELECT id, name, 'client' as type
       FROM clients 
       WHERE brand_id = $1 
         AND is_active = TRUE
         AND name ILIKE $2
       ORDER BY name ASC
       LIMIT $3`,
      [brandId, searchTerm, limit]
    );
    suggestions.push(...clientsResult.rows.map(c => ({
      id: c.id,
      text: c.name,
      type: c.type
    })));

    // Get project suggestions
    const projectsResult = await query(
      `SELECT id, name, 'project' as type
       FROM projects 
       WHERE brand_id = $1 
         AND status != 'archived'
         AND name ILIKE $2
       ORDER BY name ASC
       LIMIT $3`,
      [brandId, searchTerm, limit]
    );
    suggestions.push(...projectsResult.rows.map(p => ({
      id: p.id,
      text: p.name,
      type: p.type
    })));

    res.status(200).json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    console.error('Error getting suggestions: - searchController.js:188', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions'
    });
  }
};
