const express = require("express");
const router = express.Router();
const adminController = require("../modules/admin/controller"); // adjust path to your admin controller
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

router.get("/overview", requireAuth, requireRole(["management"]), adminController.handleGetOversight);
router.get("/requests", requireAuth, requireRole(["management"]), adminController.handleGetAllRequests);
router.get("/audit", requireAuth, requireRole(["management"]), adminController.handleGetAuditTrail);
router.get("/users", requireAuth, requireRole(["management"]), adminController.handleGetUsers);
router.patch("/users/:userId/type", requireAuth, requireRole(["management"]), adminController.handleSetUserType);

module.exports = router;