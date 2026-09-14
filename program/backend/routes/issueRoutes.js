const express = require("express");
const router = express.Router();
const {
  listIssues,
  getIssue,
  createIssue,
  updateIssueStatus,
  addComment,
  upvoteIssue,
} = require("../controllers/issueController");
const { authenticate, requireRole } = require("../middleware/auth");

router.get("/", listIssues);
router.get("/:id", getIssue);
router.post("/", authenticate, createIssue);
router.patch("/:id/status", authenticate, requireRole("staff", "admin"), updateIssueStatus);
router.post("/:id/comments", authenticate, addComment);
router.post("/:id/upvote", authenticate, upvoteIssue);

module.exports = router;