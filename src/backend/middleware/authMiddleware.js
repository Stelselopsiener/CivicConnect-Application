// src/backend/middleware/authMiddleware.js
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
    // Verify the token using your secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user data (user_id, email) to the request object
    req.user = decoded;
    next(); // Pass control to the controller
  } catch (err) {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Token is invalid or expired." },
    });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure the user object exists (populated by requireAuth)
    if (!req.user || !req.user.user_type) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "User identity or role missing",
        },
      });
    }

    // Check if the user's role is in the allowed list
    if (!allowedRoles.includes(req.user.user_type)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource",
        },
      });
    }

    // User is authorized, proceed to the controller
    next();
  };
};

module.exports = { requireAuth, requireRole }; // Make sure to export it
