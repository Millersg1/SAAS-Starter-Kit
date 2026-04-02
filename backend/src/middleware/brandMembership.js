import * as brandModel from '../models/brandModel.js';

/**
 * Express middleware that verifies brand membership once per request.
 * Attach to routes with :brandId param to eliminate redundant DB queries
 * in controllers.
 *
 * Sets req.brandMember with the membership record if valid.
 *
 * Usage:
 *   router.use('/:brandId', verifyBrandMembership);
 *   // or per-route:
 *   router.get('/:brandId', verifyBrandMembership, myHandler);
 */
export const verifyBrandMembership = async (req, res, next) => {
  try {
    const brandId = req.params.brandId;
    if (!brandId || !req.user) return next();

    // Cache on request object — only query once per request
    if (req.brandMember) return next();

    const member = await brandModel.getBrandMember(brandId, req.user.id);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand',
      });
    }

    req.brandMember = member;
    next();
  } catch (err) {
    next(err);
  }
};
