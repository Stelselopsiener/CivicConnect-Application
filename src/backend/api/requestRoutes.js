const express = require("express");
const router = express.Router();
const requestController = require("../modules/request/controller");
const { requireAuth } = require("../middleware/authMiddleware");

// Apply the middleware to protect these routes
router.get("/my", requireAuth, requestController.handleGetMyRequests);
router.post("/", requireAuth, requestController.handleCreateRequest);
router.get("/:id", requireAuth, requestController.handleGetRequestById);
router.patch("/:id/status", requireAuth, requestController.handleUpdateStatus);

// BENNO
// 6# Change - Add a new route for the deletion of requests
router.delete("/:id", requireAuth, requestController.handleCancelRequest);

module.exports = router;
