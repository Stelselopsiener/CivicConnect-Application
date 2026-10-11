const express = require("express");
const router = express.Router();
const staffController = require("../modules/staff/controller");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

// All routes here strictly require an authenticated user with user_type === 'staff'
router.use(requireAuth, requireRole(["staff"]));

// GET /api/v1/staff/requests (REQ-006, REQ-007)
router.get("/requests", staffController.handleGetStaffRequests);

// GET /api/v1/staff/members (REQ-009)
router.get("/members", staffController.handleGetStaffMembers);

// PATCH /api/v1/staff/requests/:id/assign (REQ-009, REQ-011)
router.patch("/requests/:id/assign", staffController.handleAssignRequest);

// PATCH /api/v1/staff/requests/:id/category (REQ-018)
router.patch("/requests/:id/category", staffController.handleUpdateCategory);

module.exports = router;
