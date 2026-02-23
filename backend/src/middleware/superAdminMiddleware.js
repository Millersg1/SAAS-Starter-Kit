export const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.is_superadmin) {
    return res.status(403).json({ status: 'fail', message: 'Access denied.' });
  }
  next();
};
