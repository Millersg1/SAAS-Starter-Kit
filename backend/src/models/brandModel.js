import { query } from '../config/database.js';

/**
 * Create a new brand
 * @param {Object} brandData - Brand information
 * @returns {Promise<Object>} Created brand
 */
export const createBrand = async (brandData) => {
  const { name, slug, description, logo_url, website, primary_color, secondary_color, owner_id, settings } = brandData;
  
  const result = await query(
    `INSERT INTO brands (name, slug, description, logo_url, website, primary_color, secondary_color, owner_id, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, slug, description, logo_url, website, primary_color, secondary_color, 
               owner_id, settings, is_active, created_at, updated_at`,
    [name, slug, description, logo_url, website, primary_color, secondary_color, owner_id, JSON.stringify(settings || {})]
  );
  
  return result.rows[0];
};

/**
 * Add owner as brand member automatically
 * @param {string} brandId - Brand ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created brand member
 */
export const addOwnerAsMember = async (brandId, userId) => {
  const result = await query(
    `INSERT INTO brand_members (brand_id, user_id, role, joined_at)
     VALUES ($1, $2, 'owner', CURRENT_TIMESTAMP)
     RETURNING id, brand_id, user_id, role, permissions, invited_at, joined_at, 
               is_active, created_at, updated_at`,
    [brandId, userId]
  );
  
  return result.rows[0];
};

/**
 * Get all brands for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of brands
 */
export const getUserBrands = async (userId) => {
  const result = await query(
    `SELECT b.id, b.name, b.slug, b.description, b.logo_url, b.website,
            b.primary_color, b.secondary_color, b.owner_id, b.settings,
            b.is_active, b.created_at, b.updated_at,
            b.stripe_account_id, b.stripe_connect_status,
            b.stripe_payouts_enabled, b.stripe_charges_enabled,
            bm.role, bm.permissions, bm.joined_at
     FROM brands b
     INNER JOIN brand_members bm ON b.id = bm.brand_id
     WHERE bm.user_id = $1 AND b.is_active = TRUE AND bm.is_active = TRUE
     ORDER BY b.created_at DESC`,
    [userId]
  );
  
  return result.rows;
};

/**
 * Get brand by ID
 * @param {string} brandId - Brand ID
 * @returns {Promise<Object|null>} Brand or null
 */
export const getBrandById = async (brandId) => {
  const result = await query(
    `SELECT id, name, slug, description, logo_url, website, primary_color,
            secondary_color, owner_id, settings, is_active, created_at, updated_at,
            stripe_account_id, stripe_connect_status,
            stripe_payouts_enabled, stripe_charges_enabled
     FROM brands
     WHERE id = $1 AND is_active = TRUE`,
    [brandId]
  );
  
  return result.rows[0] || null;
};

/**
 * Get brand by custom domain hostname
 * @param {string} hostname - Custom domain
 * @returns {Promise<Object|null>} Brand or null
 */
export const getBrandByCustomDomain = async (hostname) => {
  const result = await query(
    `SELECT id, name, slug, primary_color, secondary_color, logo_url
     FROM brands
     WHERE custom_domain = $1 AND is_active = TRUE`,
    [hostname]
  );
  return result.rows[0] || null;
};

/**
 * Get brand by slug
 * @param {string} slug - Brand slug
 * @returns {Promise<Object|null>} Brand or null
 */
export const getBrandBySlug = async (slug) => {
  const result = await query(
    `SELECT id, name, slug, description, logo_url, website, primary_color, 
            secondary_color, owner_id, settings, is_active, created_at, updated_at
     FROM brands
     WHERE slug = $1 AND is_active = TRUE`,
    [slug]
  );
  
  return result.rows[0] || null;
};

/**
 * Update brand
 * @param {string} brandId - Brand ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated brand
 */
export const updateBrand = async (brandId, updateData) => {
  const { name, description, logo_url, website, primary_color, secondary_color, settings, custom_domain, hunter_api_key } = updateData;

  const result = await query(
    `UPDATE brands
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         logo_url = COALESCE($3, logo_url),
         website = COALESCE($4, website),
         primary_color = COALESCE($5, primary_color),
         secondary_color = COALESCE($6, secondary_color),
         settings = COALESCE($7, settings),
         custom_domain = COALESCE($8, custom_domain),
         hunter_api_key = COALESCE($10, hunter_api_key)
     WHERE id = $9 AND is_active = TRUE
     RETURNING id, name, slug, description, logo_url, website, primary_color,
               secondary_color, owner_id, settings, custom_domain, hunter_api_key, is_active, created_at, updated_at`,
    [name, description, logo_url, website, primary_color, secondary_color,
     settings ? JSON.stringify(settings) : null, custom_domain || null, brandId, hunter_api_key ?? null]
  );
  
  return result.rows[0];
};

/**
 * Delete brand (soft delete)
 * @param {string} brandId - Brand ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteBrand = async (brandId) => {
  const result = await query(
    `UPDATE brands
     SET is_active = FALSE
     WHERE id = $1
     RETURNING id`,
    [brandId]
  );
  
  return result.rows.length > 0;
};

/**
 * Check if user is brand member
 * @param {string} brandId - Brand ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Brand member or null
 */
export const getBrandMember = async (brandId, userId) => {
  const result = await query(
    `SELECT id, brand_id, user_id, role, permissions, invited_by, 
            invited_at, joined_at, is_active, created_at, updated_at
     FROM brand_members
     WHERE brand_id = $1 AND user_id = $2 AND is_active = TRUE`,
    [brandId, userId]
  );
  
  return result.rows[0] || null;
};

/**
 * Get all members of a brand
 * @param {string} brandId - Brand ID
 * @returns {Promise<Array>} List of brand members with user info
 */
export const getBrandMembers = async (brandId) => {
  const result = await query(
    `SELECT bm.id, bm.brand_id, bm.user_id, bm.role, bm.permissions, 
            bm.invited_by, bm.invited_at, bm.joined_at, bm.is_active,
            bm.created_at, bm.updated_at,
            u.name, u.email, u.avatar_url
     FROM brand_members bm
     INNER JOIN users u ON bm.user_id = u.id
     WHERE bm.brand_id = $1 AND bm.is_active = TRUE AND u.is_active = TRUE
     ORDER BY bm.created_at ASC`,
    [brandId]
  );
  
  return result.rows;
};

/**
 * Add member to brand
 * @param {Object} memberData - Member information
 * @returns {Promise<Object>} Created brand member
 */
export const addBrandMember = async (memberData) => {
  const { brand_id, user_id, role, permissions, invited_by } = memberData;
  
  const result = await query(
    `INSERT INTO brand_members (brand_id, user_id, role, permissions, invited_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, brand_id, user_id, role, permissions, invited_by, 
               invited_at, joined_at, is_active, created_at, updated_at`,
    [brand_id, user_id, role, JSON.stringify(permissions || {}), invited_by]
  );
  
  return result.rows[0];
};

/**
 * Update brand member role
 * @param {string} memberId - Brand member ID
 * @param {string} role - New role
 * @param {Object} permissions - New permissions
 * @returns {Promise<Object>} Updated brand member
 */
export const updateBrandMemberRole = async (memberId, role, permissions) => {
  const result = await query(
    `UPDATE brand_members
     SET role = $1,
         permissions = $2
     WHERE id = $3 AND is_active = TRUE
     RETURNING id, brand_id, user_id, role, permissions, invited_by, 
               invited_at, joined_at, is_active, created_at, updated_at`,
    [role, JSON.stringify(permissions || {}), memberId]
  );
  
  return result.rows[0];
};

/**
 * Remove member from brand
 * @param {string} memberId - Brand member ID
 * @returns {Promise<boolean>} Success status
 */
export const removeBrandMember = async (memberId) => {
  const result = await query(
    `UPDATE brand_members
     SET is_active = FALSE
     WHERE id = $1
     RETURNING id`,
    [memberId]
  );
  
  return result.rows.length > 0;
};

/**
 * Accept brand invitation (set joined_at)
 * @param {string} memberId - Brand member ID
 * @returns {Promise<Object>} Updated brand member
 */
/**
 * Get the owner user of a brand (for email notifications)
 * @param {string} brandId - Brand ID
 * @returns {Promise<Object|null>} { id, name, email }
 */
export const getBrandOwner = async (brandId) => {
  const result = await query(
    `SELECT u.id, u.name, u.email
     FROM users u
     INNER JOIN brands b ON b.owner_id = u.id
     WHERE b.id = $1 AND b.is_active = TRUE`,
    [brandId]
  );
  return result.rows[0] || null;
};

export const acceptBrandInvitation = async (memberId) => {
  const result = await query(
    `UPDATE brand_members
     SET joined_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = TRUE
     RETURNING id, brand_id, user_id, role, permissions, invited_by,
               invited_at, joined_at, is_active, created_at, updated_at`,
    [memberId]
  );

  return result.rows[0];
};

// ============================================
// STRIPE CONNECT
// ============================================

/**
 * Update Stripe Connect fields on a brand
 */
export const updateBrandStripeConnect = async (brandId, connectData) => {
  const {
    stripe_account_id,
    stripe_connect_status,
    stripe_payouts_enabled,
    stripe_charges_enabled,
    stripe_connect_created_at,
  } = connectData;

  const result = await query(
    `UPDATE brands
     SET stripe_account_id         = COALESCE($1, stripe_account_id),
         stripe_connect_status     = COALESCE($2, stripe_connect_status),
         stripe_payouts_enabled    = COALESCE($3, stripe_payouts_enabled),
         stripe_charges_enabled    = COALESCE($4, stripe_charges_enabled),
         stripe_connect_created_at = COALESCE($5, stripe_connect_created_at)
     WHERE id = $6 AND is_active = TRUE
     RETURNING id, name, stripe_account_id, stripe_connect_status,
               stripe_payouts_enabled, stripe_charges_enabled, stripe_connect_created_at`,
    [
      stripe_account_id,
      stripe_connect_status,
      stripe_payouts_enabled,
      stripe_charges_enabled,
      stripe_connect_created_at,
      brandId,
    ]
  );
  return result.rows[0];
};

/**
 * Get brand by Stripe connected account ID (used in webhook handler)
 */
export const getBrandByStripeAccountId = async (stripeAccountId) => {
  const result = await query(
    `SELECT id, name, stripe_account_id, stripe_connect_status,
            stripe_payouts_enabled, stripe_charges_enabled, owner_id
     FROM brands
     WHERE stripe_account_id = $1 AND is_active = TRUE`,
    [stripeAccountId]
  );
  return result.rows[0] || null;
};

/**
 * Get Stripe Connect status for a brand (lightweight query)
 */
export const getBrandConnectStatus = async (brandId) => {
  const result = await query(
    `SELECT id, stripe_account_id, stripe_connect_status,
            stripe_payouts_enabled, stripe_charges_enabled, stripe_connect_created_at
     FROM brands
     WHERE id = $1 AND is_active = TRUE`,
    [brandId]
  );
  return result.rows[0] || null;
};
