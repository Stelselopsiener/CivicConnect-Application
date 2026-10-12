const express = require("express");
const router = express.Router();
const adminController = require("../modules/admin/controller");
const { requireAuth } = require("../middleware/authMiddleware");

// Apply the middleware to protect these admin routes
router.get("/overview", requireAuth, adminController.handleGetOversight);
router.get("/requests", requireAuth, adminController.handleGetAllRequests);
router.get("/audit", requireAuth, adminController.handleGetAuditTrail);
router.get("/users", requireAuth, adminController.handleGetUsers);
router.patch(
  "/users/:userId/type",
  requireAuth,
  adminController.handleSetUserType,
);

module.exports = router;
