const authorizeRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
    }

    const role = req.user.role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    return next();
  };

export default authorizeRoles;
