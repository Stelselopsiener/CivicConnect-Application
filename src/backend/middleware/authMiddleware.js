const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Missing or invalid token." },
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Token is invalid or expired." },
    });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.user_type) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "User identity or role missing",
        },
      });
    }

    if (!allowedRoles.includes(req.user.user_type)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource",
        },
      });
    }

    next();
  };
};

module.exports = { requireAuth, requireRole };
