const express = require("express");
const router = express.Router();
const staffController = require("../modules/staff/controller");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

router.get(
  "/requests",
  requireAuth,
  requireRole(["staff"]),
  staffController.handleGetWorklist,
);

router.get(
  "/members",
  requireAuth,
  requireRole(["staff"]),
  staffController.handleGetStaffByCategory,
);

router.patch(
  "/requests/:id/assign",
  requireAuth,
  requireRole(["staff"]),
  staffController.handleAssignRequest,
);

router.patch(
  "/requests/:id/category",
  requireAuth,
  requireRole(["staff"]),
  staffController.handleUpdateCategory,
);

module.exports = router;
