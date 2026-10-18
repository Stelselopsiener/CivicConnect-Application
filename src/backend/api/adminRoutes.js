const express = require("express");
const router = express.Router();
const adminController = require("../modules/admin/controller");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

// Apply the middleware to protect these admin routes (management only)
router.get(
  "/overview",
  requireAuth,
  requireRole(["management"]),
  adminController.handleGetOversight,
);
router.get(
  "/requests",
  requireAuth,
  requireRole(["management"]),
  adminController.handleGetAllRequests,
);
router.get(
  "/audit",
  requireAuth,
  requireRole(["management"]),
  adminController.handleGetAuditTrail,
);
router.get(
  "/users",
  requireAuth,
  requireRole(["management"]),
  adminController.handleGetUsers,
);
router.patch(
  "/users/:userId/type",
  requireAuth,
  requireRole(["management"]),
  adminController.handleSetUserType,
);

module.exports = router;
