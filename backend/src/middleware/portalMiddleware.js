import { verifyToken } from '../utils/jwtUtils.js';
import { getClientById } from '../models/clientModel.js';
import { AppError, catchAsync } from './errorHandler.js';

/**
 * Protect portal routes - requires a valid portal JWT (type: 'portal')
 * Attaches req.portalClient and req.portalBrandId
 */
export const protectPortal = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Please log in to access the client portal.', 401));
  }

  const decoded = verifyToken(token);

  if (decoded.type !== 'portal') {
    return next(new AppError('Invalid portal token.', 401));
  }

  const client = await getClientById(decoded.clientId);

  if (!client) {
    return next(new AppError('Client account no longer exists.', 401));
  }

  if (!client.portal_access) {
    return next(new AppError('Portal access has been disabled for this account.', 403));
  }

  req.portalClient = client;
  req.portalBrandId = decoded.brandId;
  next();
});
