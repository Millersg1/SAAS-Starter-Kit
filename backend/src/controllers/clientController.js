import * as clientModel from '../models/clientModel.js';
import * as brandModel from '../models/brandModel.js';
import bcrypt from 'bcryptjs';
import { sendPortalAccessEmail } from '../utils/emailUtils.js';
import { deliverWebhook } from '../utils/webhookDelivery.js';
import { triggerWorkflow } from '../utils/workflowEngine.js';
import { query } from '../config/database.js';

/**
 * Create a new client
 * @route POST /api/brands/:brandId/clients
 * @access Private (Brand members only)
 */
export const createClient = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const clientData = req.body;

    // Check if user is a member of this brand
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check plan limits
    try {
      const limitResult = await query(
        `SELECT sp.max_clients,
                COUNT(c.id) as current_count
         FROM subscriptions s
         JOIN subscription_plans sp ON s.plan_id = sp.id
         LEFT JOIN clients c ON c.brand_id = $1 AND c.is_active = TRUE
         WHERE s.brand_id = $1 AND s.status IN ('active','trialing')
         GROUP BY sp.max_clients`,
        [brandId]
      );
      if (limitResult.rows.length > 0) {
        const { max_clients, current_count } = limitResult.rows[0];
        if (max_clients !== null && parseInt(current_count) >= parseInt(max_clients)) {
          return res.status(403).json({
            status: 'fail',
            code: 'plan_limit_reached',
            message: `You have reached your plan limit of ${max_clients} client${max_clients !== 1 ? 's' : ''}. Please upgrade to add more.`,
            limit: parseInt(max_clients),
            current: parseInt(current_count),
          });
        }
      }
    } catch (limitErr) {
      // If limit check fails, allow the operation (fail open)
      console.error('Plan limit check failed:', limitErr.message);
    }

    // Check if client with same email already exists in this brand
    if (clientData.email) {
      const existingClient = await clientModel.getClientByEmail(brandId, clientData.email);
      if (existingClient) {
        return res.status(400).json({
          status: 'fail',
          message: 'A client with this email already exists in this brand'
        });
      }
    }

    // Create the client
    const client = await clientModel.createClient({
      ...clientData,
      brand_id: brandId,
      created_by: userId
    });

    // Webhook: client.created
    deliverWebhook(brandId, 'client.created', { id: client.id, name: client.name, email: client.email }).catch(() => {});
    triggerWorkflow(brandId, 'client_created', client.id, 'client').catch(() => {});

    res.status(201).json({
      status: 'success',
      message: 'Client created successfully',
      data: {
        client
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all clients for a brand
 * @route GET /api/brands/:brandId/clients
 * @access Private (Brand members only)
 */
export const getBrandClients = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const { status, client_type, assigned_to, search, limit, offset } = req.query;

    // Check if user is a member of this brand
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const clients = await clientModel.getBrandClients(brandId, {
      status,
      client_type,
      assigned_to,
      search,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.status(200).json({
      status: 'success',
      results: clients.length,
      data: {
        clients
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client by ID
 * @route GET /api/brands/:brandId/clients/:clientId
 * @access Private (Brand members only)
 */
export const getClient = async (req, res, next) => {
  try {
    const { brandId, clientId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of this brand
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const client = await clientModel.getClientById(clientId);
    if (!client) {
      return res.status(404).json({
        status: 'fail',
        message: 'Client not found'
      });
    }

    // Verify client belongs to this brand
    if (client.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This client does not belong to the specified brand'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        client
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update client
 * @route PATCH /api/brands/:brandId/clients/:clientId
 * @access Private (Brand members only)
 */
export const updateClient = async (req, res, next) => {
  try {
    const { brandId, clientId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if user is a member of this brand
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Get existing client
    const existingClient = await clientModel.getClientById(clientId);
    if (!existingClient) {
      return res.status(404).json({
        status: 'fail',
        message: 'Client not found'
      });
    }

    // Verify client belongs to this brand
    if (existingClient.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This client does not belong to the specified brand'
      });
    }

    // Check if email is being changed and if it already exists
    if (updateData.email && updateData.email !== existingClient.email) {
      const emailExists = await clientModel.getClientByEmail(brandId, updateData.email);
      if (emailExists) {
        return res.status(400).json({
          status: 'fail',
          message: 'A client with this email already exists in this brand'
        });
      }
    }

    const client = await clientModel.updateClient(clientId, updateData);
    if (!client) {
      return res.status(404).json({
        status: 'fail',
        message: 'Failed to update client'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Client updated successfully',
      data: {
        client
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete client
 * @route DELETE /api/brands/:brandId/clients/:clientId
 * @access Private (Owner/Admin only)
 */
export const deleteClient = async (req, res, next) => {
  try {
    const { brandId, clientId } = req.params;
    const userId = req.user.id;

    // Check if user is owner or admin
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to delete clients'
      });
    }

    // Get existing client
    const existingClient = await clientModel.getClientById(clientId);
    if (!existingClient) {
      return res.status(404).json({
        status: 'fail',
        message: 'Client not found'
      });
    }

    // Verify client belongs to this brand
    if (existingClient.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This client does not belong to the specified brand'
      });
    }

    await clientModel.deleteClient(clientId);

    res.status(200).json({
      status: 'success',
      message: 'Client deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client statistics for a brand
 * @route GET /api/brands/:brandId/clients/stats
 * @access Private (Brand members only)
 */
export const getClientStats = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of this brand
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const stats = await clientModel.getClientStats(brandId);

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get clients assigned to current user
 * @route GET /api/clients/assigned
 * @access Private
 */
export const getAssignedClients = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const clients = await clientModel.getAssignedClients(userId);

    res.status(200).json({
      status: 'success',
      results: clients.length,
      data: {
        clients
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enable portal access for client
 * @route POST /api/brands/:brandId/clients/:clientId/portal/enable
 * @access Private (Owner/Admin only)
 */
export const enablePortalAccess = async (req, res, next) => {
  try {
    const { brandId, clientId } = req.params;
    const { password } = req.body;
    const userId = req.user.id;

    // Validate password is provided
    if (!password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password is required to enable portal access'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if user is owner or admin
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to manage portal access'
      });
    }

    // Get existing client
    const existingClient = await clientModel.getClientById(clientId);
    if (!existingClient) {
      return res.status(404).json({
        status: 'fail',
        message: 'Client not found'
      });
    }

    // Verify client belongs to this brand
    if (existingClient.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This client does not belong to the specified brand'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const client = await clientModel.enablePortalAccess(clientId, passwordHash);

    // Send portal credentials email to client
    try {
      const brand = await brandModel.getBrandById(brandId);
      const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/login?brand=${brandId}`;
      await sendPortalAccessEmail(
        existingClient.email, existingClient.name,
        brand?.name || 'Your Account Manager',
        portalUrl, password
      );
    } catch (emailErr) {
      console.error('Failed to send portal access email:', emailErr);
    }

    res.status(200).json({
      status: 'success',
      message: 'Portal access enabled successfully',
      data: {
        client
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable portal access for client
 * @route POST /api/brands/:brandId/clients/:clientId/portal/disable
 * @access Private (Owner/Admin only)
 */
export const disablePortalAccess = async (req, res, next) => {
  try {
    const { brandId, clientId } = req.params;
    const userId = req.user.id;

    // Check if user is owner or admin
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to manage portal access'
      });
    }

    // Get existing client
    const existingClient = await clientModel.getClientById(clientId);
    if (!existingClient) {
      return res.status(404).json({
        status: 'fail',
        message: 'Client not found'
      });
    }

    // Verify client belongs to this brand
    if (existingClient.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This client does not belong to the specified brand'
      });
    }

    const client = await clientModel.disablePortalAccess(clientId);

    res.status(200).json({
      status: 'success',
      message: 'Portal access disabled successfully',
      data: {
        client
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk import clients from a JSON array (parsed from CSV on the frontend).
 * @route POST /api/clients/:brandId/import
 * @access Private
 */
export const importClients = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'You do not have access to this brand' });
    }

    const rows = req.body.clients;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'No client data provided' });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      if (!row.name || !row.email) {
        results.skipped++;
        continue;
      }
      try {
        const existing = await clientModel.getClientByEmail(brandId, row.email.trim());
        if (existing) {
          results.skipped++;
          continue;
        }
        await clientModel.createClient({
          brand_id: brandId,
          name: row.name.trim(),
          email: row.email.trim(),
          phone: row.phone?.trim() || null,
          company: row.company?.trim() || null,
          address: row.address?.trim() || null,
          city: row.city?.trim() || null,
          state: row.state?.trim() || null,
          country: row.country?.trim() || null,
          status: 'active',
          created_by: userId,
        });
        results.created++;
      } catch (err) {
        results.errors.push({ name: row.name, error: err.message });
      }
    }

    res.status(200).json({ status: 'success', data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/clients/:brandId/tags
 * Returns all distinct tags used across a brand's clients.
 */
export const getBrandTags = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const member = await brandModel.getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied.' });

    const result = await query(
      `SELECT DISTINCT UNNEST(tags) AS tag FROM clients WHERE brand_id = $1 AND is_active = TRUE AND tags IS NOT NULL ORDER BY tag`,
      [brandId]
    );
    res.json({ status: 'success', data: { tags: result.rows.map(r => r.tag) } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/clients/:brandId/bulk-tag
 * Body: { client_ids: string[], tags: string[], action: 'add'|'remove' }
 */
export const bulkTagClients = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const { client_ids, tags, action = 'add' } = req.body;
    const member = await brandModel.getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    if (!Array.isArray(client_ids) || client_ids.length === 0) return res.status(400).json({ status: 'fail', message: 'client_ids required' });
    if (!Array.isArray(tags) || tags.length === 0) return res.status(400).json({ status: 'fail', message: 'tags required' });

    const op = action === 'remove'
      ? `UPDATE clients SET tags = ARRAY(SELECT UNNEST(COALESCE(tags,'{}')) EXCEPT SELECT UNNEST($1::text[])) WHERE id = ANY($2::uuid[]) AND brand_id = $3`
      : `UPDATE clients SET tags = ARRAY(SELECT DISTINCT UNNEST(COALESCE(tags,'{}') || $1::text[])) WHERE id = ANY($2::uuid[]) AND brand_id = $3`;

    await query(op, [tags, client_ids, brandId]);
    res.json({ status: 'success', message: `Tags ${action}ed successfully` });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/clients/:brandId/portal-activity
 * Returns portal-enabled clients with last login time and payment totals.
 */
export const getPortalActivity = async (req, res, next) => {
  try {
    const { brandId } = req.params;

    const member = await brandModel.getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied.' });

    const result = await query(
      `SELECT
         c.id, c.name, c.email, c.company, c.portal_access,
         c.last_portal_login,
         COUNT(p.id) FILTER (WHERE p.payment_status = 'completed')         AS invoices_paid,
         COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'completed'), 0) AS total_paid
       FROM clients c
       LEFT JOIN payments p ON p.client_id = c.id
       WHERE c.brand_id = $1
         AND c.is_active = TRUE
         AND c.portal_access = TRUE
       GROUP BY c.id
       ORDER BY c.last_portal_login DESC NULLS LAST
       LIMIT 20`,
      [brandId]
    );

    res.status(200).json({ status: 'success', data: { clients: result.rows } });
  } catch (error) {
    next(error);
  }
};
