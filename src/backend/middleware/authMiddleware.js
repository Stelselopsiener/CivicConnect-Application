// src/backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({
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
    return res
      .status(403)
      .json({
        error: { code: "FORBIDDEN", message: "Token is invalid or expired." },
      });
  }
};

module.exports = { requireAuth };
