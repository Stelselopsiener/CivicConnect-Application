const express = require("express");
const router = express.Router();
const requestController = require("../modules/request/controller");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

// Apply the middleware to protect these routes
router.get(
  "/my",
  requireAuth,
  requireRole(["requester"]),
  requestController.handleGetMyRequests,
);
router.post(
  "/",
  requireAuth,
  requireRole(["requester"]),
  requestController.handleCreateRequest,
);
router.get(
  "/:id",
  requireAuth,
  requireRole(["requester", "staff"]),
  requestController.handleGetRequestById,
);
router.patch(
  "/:id/status",
  requireAuth,
  requireRole(["requester", "staff"]),
  requestController.handleUpdateStatus,
);

// BENNO
// 6# Change - Add a new route for the deletion of requests
router.delete(
  "/:id",
  requireAuth,
  requireRole(["requester"]),
  requestController.handleCancelRequest,
);

module.exports = router;
