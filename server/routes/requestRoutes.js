const express = require("express");
const router = express.Router();
const { getRequests } = require("../controllers/requestController");

router.get("/", getRequests);

module.exports = router;
