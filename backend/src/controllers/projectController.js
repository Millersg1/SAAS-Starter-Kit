import * as projectModel from '../models/projectModel.js';
import * as brandModel from '../models/brandModel.js';
import * as clientModel from '../models/clientModel.js';
import { sendProjectUpdateEmail } from '../utils/emailUtils.js';
import { query } from '../config/database.js';

/**
 * Create a new project
 * @route POST /api/projects/:brandId
 * @access Private (Brand members only)
 */
export const createProject = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const projectData = req.body;

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
        `SELECT sp.max_projects,
                COUNT(p.id) as current_count
         FROM subscriptions s
         JOIN subscription_plans sp ON s.plan_id = sp.id
         LEFT JOIN projects p ON p.brand_id = $1 AND p.is_active = TRUE
         WHERE s.brand_id = $1 AND s.status IN ('active','trialing')
         GROUP BY sp.max_projects`,
        [brandId]
      );
      if (limitResult.rows.length > 0) {
        const { max_projects, current_count } = limitResult.rows[0];
        if (max_projects !== null && parseInt(current_count) >= parseInt(max_projects)) {
          return res.status(403).json({
            status: 'fail',
            code: 'plan_limit_reached',
            message: `You have reached your plan limit of ${max_projects} project${max_projects !== 1 ? 's' : ''}. Please upgrade to add more.`,
            limit: parseInt(max_projects),
            current: parseInt(current_count),
          });
        }
      }
    } catch (limitErr) {
      console.error('Plan limit check failed:', limitErr.message);
    }

    // Verify client belongs to this brand
    const client = await clientModel.getClientById(projectData.client_id);
    if (!client || client.brand_id !== brandId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Client does not belong to this brand'
      });
    }

    // Create the project
    const project = await projectModel.createProject({
      ...projectData,
      brand_id: brandId,
      created_by: userId
    });

    res.status(201).json({
      status: 'success',
      message: 'Project created successfully',
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all projects for a brand
 * @route GET /api/projects/:brandId
 * @access Private (Brand members only)
 */
export const getBrandProjects = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const { client_id, status, priority, project_type, project_manager_id, search, limit, offset } = req.query;

    // Check if user is a member of this brand
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const projects = await projectModel.getBrandProjects(brandId, {
      client_id,
      status,
      priority,
      project_type,
      project_manager_id,
      search,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.status(200).json({
      status: 'success',
      results: projects.length,
      data: {
        projects
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get project by ID
 * @route GET /api/projects/:brandId/:projectId
 * @access Private (Brand members only)
 */
export const getProject = async (req, res, next) => {
  try {
    const { brandId, projectId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of this brand
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project not found'
      });
    }

    // Verify project belongs to this brand
    if (project.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This project does not belong to the specified brand'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update project
 * @route PATCH /api/projects/:brandId/:projectId
 * @access Private (Brand members only)
 */
export const updateProject = async (req, res, next) => {
  try {
    const { brandId, projectId } = req.params;
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

    // Get existing project
    const existingProject = await projectModel.getProjectById(projectId);
    if (!existingProject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project not found'
      });
    }

    // Verify project belongs to this brand
    if (existingProject.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This project does not belong to the specified brand'
      });
    }

    const project = await projectModel.updateProject(projectId, updateData);
    if (!project) {
      return res.status(404).json({
        status: 'fail',
        message: 'Failed to update project'
      });
    }

    // Auto reputation review request on project completion
    if (updateData.status === 'completed' && existingProject.status !== 'completed' && project.client_id) {
      import('../utils/reputationTrigger.js')
        .then(m => m.autoSendReviewRequest(brandId, project.client_id, 'project_completed'))
        .catch(() => {});

      // Auto-trigger NPS/CSAT surveys configured for project_complete
      import('./surveyController.js')
        .then(m => m.triggerSurveyForEvent('project_complete', brandId, project.client_id))
        .catch(() => {});
    }

    res.status(200).json({
      status: 'success',
      message: 'Project updated successfully',
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete project
 * @route DELETE /api/projects/:brandId/:projectId
 * @access Private (Owner/Admin only)
 */
export const deleteProject = async (req, res, next) => {
  try {
    const { brandId, projectId } = req.params;
    const userId = req.user.id;

    // Check if user is owner or admin
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to delete projects'
      });
    }

    // Get existing project
    const existingProject = await projectModel.getProjectById(projectId);
    if (!existingProject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project not found'
      });
    }

    // Verify project belongs to this brand
    if (existingProject.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This project does not belong to the specified brand'
      });
    }

    await projectModel.deleteProject(projectId);

    res.status(200).json({
      status: 'success',
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get project statistics for a brand
 * @route GET /api/projects/:brandId/stats
 * @access Private (Brand members only)
 */
export const getProjectStats = async (req, res, next) => {
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

    const stats = await projectModel.getProjectStats(brandId);

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
 * Get projects assigned to current user
 * @route GET /api/projects/assigned
 * @access Private
 */
export const getUserProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const projects = await projectModel.getUserProjects(userId);

    res.status(200).json({
      status: 'success',
      results: projects.length,
      data: {
        projects
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client projects
 * @route GET /api/projects/client/:clientId
 * @access Private
 */
export const getClientProjects = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const userId = req.user.id;

    // Get client to verify access
    const client = await clientModel.getClientById(clientId);
    if (!client) {
      return res.status(404).json({
        status: 'fail',
        message: 'Client not found'
      });
    }

    // Check if user is a member of the client's brand
    const member = await brandModel.getBrandMember(client.brand_id, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this client'
      });
    }

    const projects = await projectModel.getClientProjects(clientId);

    res.status(200).json({
      status: 'success',
      results: projects.length,
      data: {
        projects
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= PROJECT UPDATES =============

/**
 * Create a project update
 * @route POST /api/projects/:brandId/:projectId/updates
 * @access Private (Brand members only)
 */
export const createProjectUpdate = async (req, res, next) => {
  try {
    const { brandId, projectId } = req.params;
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

    // Verify project exists and belongs to this brand
    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project not found'
      });
    }

    if (project.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This project does not belong to the specified brand'
      });
    }

    // Create the update
    const update = await projectModel.createProjectUpdate({
      ...updateData,
      project_id: projectId,
      created_by: userId
    });

    // Send email notification if visible to client and project has a client
    if (updateData.is_visible_to_client && project.client_id) {
      try {
        const client = await clientModel.getClientById(project.client_id);
        if (client?.email) {
          const brand = await brandModel.getBrandById(brandId);
          const portalUrl = brand
            ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/login?brand=${brandId}`
            : null;
          await sendProjectUpdateEmail(
            client.email, client.name,
            project.name, updateData.title || 'New Update', updateData.content || '',
            portalUrl, brand?.name || 'Your Account Manager'
          );
        }
      } catch (emailErr) {
        console.error('Failed to send project update email:', emailErr);
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Project update created successfully',
      data: {
        update
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get project updates
 * @route GET /api/projects/:brandId/:projectId/updates
 * @access Private (Brand members only)
 */
export const getProjectUpdates = async (req, res, next) => {
  try {
    const { brandId, projectId } = req.params;
    const userId = req.user.id;
    const { update_type, visible_to_client, limit, offset } = req.query;

    // Check if user is a member of this brand
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Verify project exists and belongs to this brand
    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project not found'
      });
    }

    if (project.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This project does not belong to the specified brand'
      });
    }

    const updates = await projectModel.getProjectUpdates(projectId, {
      update_type,
      visible_to_client: visible_to_client !== undefined ? visible_to_client === 'true' : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.status(200).json({
      status: 'success',
      results: updates.length,
      data: {
        updates
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single project update
 * @route GET /api/projects/:brandId/:projectId/updates/:updateId
 * @access Private (Brand members only)
 */
export const getProjectUpdate = async (req, res, next) => {
  try {
    const { brandId, projectId, updateId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of this brand
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Verify project exists and belongs to this brand
    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project not found'
      });
    }

    if (project.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This project does not belong to the specified brand'
      });
    }

    const update = await projectModel.getProjectUpdateById(updateId);
    if (!update) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project update not found'
      });
    }

    // Verify update belongs to this project
    if (update.project_id !== projectId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This update does not belong to the specified project'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        update
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update project update
 * @route PATCH /api/projects/:brandId/:projectId/updates/:updateId
 * @access Private (Brand members only)
 */
export const updateProjectUpdate = async (req, res, next) => {
  try {
    const { brandId, projectId, updateId } = req.params;
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

    // Verify project exists and belongs to this brand
    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project not found'
      });
    }

    if (project.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This project does not belong to the specified brand'
      });
    }

    // Get existing update
    const existingUpdate = await projectModel.getProjectUpdateById(updateId);
    if (!existingUpdate) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project update not found'
      });
    }

    // Verify update belongs to this project
    if (existingUpdate.project_id !== projectId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This update does not belong to the specified project'
      });
    }

    const update = await projectModel.updateProjectUpdate(updateId, updateData);
    if (!update) {
      return res.status(404).json({
        status: 'fail',
        message: 'Failed to update project update'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Project update updated successfully',
      data: {
        update
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete project update
 * @route DELETE /api/projects/:brandId/:projectId/updates/:updateId
 * @access Private (Owner/Admin only)
 */
export const deleteProjectUpdate = async (req, res, next) => {
  try {
    const { brandId, projectId, updateId } = req.params;
    const userId = req.user.id;

    // Check if user is owner or admin
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to delete project updates'
      });
    }

    // Verify project exists and belongs to this brand
    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project not found'
      });
    }

    if (project.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This project does not belong to the specified brand'
      });
    }

    // Get existing update
    const existingUpdate = await projectModel.getProjectUpdateById(updateId);
    if (!existingUpdate) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project update not found'
      });
    }

    // Verify update belongs to this project
    if (existingUpdate.project_id !== projectId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This update does not belong to the specified project'
      });
    }

    await projectModel.deleteProjectUpdate(updateId);

    res.status(200).json({
      status: 'success',
      message: 'Project update deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
