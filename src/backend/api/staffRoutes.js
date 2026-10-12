const express = require("express");
const router = express.Router();
const staffController = require("../modules/staff/controller");
const { requireAuth } = require("../middleware/authMiddleware");

// Ensure these method names exactly match the exports in staff/controller.js
router.get("/requests", requireAuth, staffController.handleGetWorklist);
router.get("/members", requireAuth, staffController.handleGetStaffByCategory);
router.patch(
  "/requests/:id/assign",
  requireAuth,
  staffController.handleAssignRequest,
);
router.patch(
  "/requests/:id/category",
  requireAuth,
  staffController.handleUpdateCategory,
);

module.exports = router;
