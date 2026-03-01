import * as brandModel from '../models/brandModel.js';
import * as userModel from '../models/userModel.js';

/**
 * Create a new brand
 * @route POST /api/brands
 * @access Private
 */
export const createBrand = async (req, res, next) => {
  try {
    const { name, description, logo_url, website, primary_color, secondary_color, settings } = req.body;
    const slug = req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const userId = req.user.id;

    // Check if slug already exists
    const existingBrand = await brandModel.getBrandBySlug(slug);
    if (existingBrand) {
      return res.status(400).json({
        status: 'fail',
        message: 'A brand with this slug already exists'
      });
    }

    // Create the brand
    const brand = await brandModel.createBrand({
      name,
      slug,
      description,
      logo_url,
      website,
      primary_color: primary_color || '#007bff',
      secondary_color: secondary_color || '#6c757d',
      owner_id: userId,
      settings: settings || {}
    });

    // Add owner as brand member
    await brandModel.addOwnerAsMember(brand.id, userId);

    res.status(201).json({
      status: 'success',
      message: 'Brand created successfully',
      data: {
        brand
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all brands for current user
 * @route GET /api/brands
 * @access Private
 */
export const getUserBrands = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const brands = await brandModel.getUserBrands(userId);

    res.status(200).json({
      status: 'success',
      results: brands.length,
      data: {
        brands
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get brand by ID
 * @route GET /api/brands/:brandId
 * @access Private
 */
export const getBrand = async (req, res, next) => {
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

    const brand = await brandModel.getBrandById(brandId);
    if (!brand) {
      return res.status(404).json({
        status: 'fail',
        message: 'Brand not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        brand,
        userRole: member.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update brand
 * @route PATCH /api/brands/:brandId
 * @access Private (Owner/Admin only)
 */
export const updateBrand = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if user is owner or admin
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update this brand'
      });
    }

    const brand = await brandModel.updateBrand(brandId, updateData);
    if (!brand) {
      return res.status(404).json({
        status: 'fail',
        message: 'Brand not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Brand updated successfully',
      data: {
        brand
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete brand
 * @route DELETE /api/brands/:brandId
 * @access Private (Owner only)
 */
export const deleteBrand = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Check if user is owner
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the brand owner can delete the brand'
      });
    }

    await brandModel.deleteBrand(brandId);

    res.status(200).json({
      status: 'success',
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all members of a brand
 * @route GET /api/brands/:brandId/members
 * @access Private
 */
export const getBrandMembers = async (req, res, next) => {
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

    const members = await brandModel.getBrandMembers(brandId);

    res.status(200).json({
      status: 'success',
      results: members.length,
      data: {
        members
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add member to brand
 * @route POST /api/brands/:brandId/members
 * @access Private (Owner/Admin only)
 */
export const addBrandMember = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const { user_id, role, permissions } = req.body;
    const userId = req.user.id;

    // Check if current user is owner or admin
    const currentMember = await brandModel.getBrandMember(brandId, userId);
    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to add members to this brand'
      });
    }

    // Check if user to be added exists
    const userToAdd = await userModel.findUserById(user_id);
    if (!userToAdd) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if user is already a member
    const existingMember = await brandModel.getBrandMember(brandId, user_id);
    if (existingMember) {
      return res.status(400).json({
        status: 'fail',
        message: 'User is already a member of this brand'
      });
    }

    // Add member
    const newMember = await brandModel.addBrandMember({
      brand_id: brandId,
      user_id,
      role,
      permissions: permissions || {},
      invited_by: userId
    });

    res.status(201).json({
      status: 'success',
      message: 'Member added successfully',
      data: {
        member: {
          ...newMember,
          name: userToAdd.name,
          email: userToAdd.email,
          avatar_url: userToAdd.avatar_url
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update brand member role
 * @route PATCH /api/brands/:brandId/members/:memberId
 * @access Private (Owner/Admin only)
 */
export const updateBrandMemberRole = async (req, res, next) => {
  try {
    const { brandId, memberId } = req.params;
    const { role, permissions } = req.body;
    const userId = req.user.id;

    // Check if current user is owner or admin
    const currentMember = await brandModel.getBrandMember(brandId, userId);
    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update member roles'
      });
    }

    // Get the member to update (memberId is the user_id in the route)
    const memberToUpdate = await brandModel.getBrandMember(brandId, memberId);
    if (!memberToUpdate) {
      return res.status(404).json({
        status: 'fail',
        message: 'Member not found'
      });
    }

    // Cannot change owner role
    if (memberToUpdate.role === 'owner') {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot change the role of the brand owner'
      });
    }

    // Update using the brand_member record ID
    const updatedMember = await brandModel.updateBrandMemberRole(memberToUpdate.id, role, permissions || {});
    if (!updatedMember) {
      return res.status(404).json({
        status: 'fail',
        message: 'Failed to update member'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Member role updated successfully',
      data: {
        member: updatedMember
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove member from brand
 * @route DELETE /api/brands/:brandId/members/:memberId
 * @access Private (Owner/Admin only)
 */
export const removeBrandMember = async (req, res, next) => {
  try {
    const { brandId, memberId } = req.params;
    const userId = req.user.id;

    // Check if current user is owner or admin
    const currentMember = await brandModel.getBrandMember(brandId, userId);
    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to remove members'
      });
    }

    // Get the member to remove (memberId is the user_id in the route)
    const memberToRemove = await brandModel.getBrandMember(brandId, memberId);
    if (!memberToRemove) {
      return res.status(404).json({
        status: 'fail',
        message: 'Member not found'
      });
    }

    // Cannot remove owner
    if (memberToRemove.role === 'owner') {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot remove the brand owner'
      });
    }

    // Remove using the brand_member record ID
    await brandModel.removeBrandMember(memberToRemove.id);

    res.status(200).json({
      status: 'success',
      message: 'Member removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ── Brand Voice Profile ────────────────────────────────────────────────────────

export const getBrandVoice = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const member = await brandModel.getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ status: 'error', message: 'Access denied' });
    const voice = await brandModel.getBrandVoice(brandId);
    res.json({ status: 'success', data: voice });
  } catch (error) { next(error); }
};

export const updateBrandVoice = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const member = await brandModel.getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ status: 'error', message: 'Access denied' });
    const voice = await brandModel.updateBrandVoice(brandId, req.body);
    res.json({ status: 'success', data: voice });
  } catch (error) { next(error); }
};
