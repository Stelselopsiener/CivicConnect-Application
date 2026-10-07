const express = require("express");
const router = express.Router();
const requestController = require("../modules/request/controller");
const { requireAuth } = require("../middleware/authMiddleware");

// Apply the middleware to protect these routes
router.get("/my", requireAuth, requestController.handleGetMyRequests);
router.post("/", requireAuth, requestController.handleCreateRequest);
router.get("/:id", requireAuth, requestController.handleGetRequestById);

module.exports = router;
