const express = require("express");
const router = express.Router();
const userController = require("../modules/user/controller");

router.post("/register", userController.handleRegisterUser);
router.post("/login", userController.handleLoginUser);
router.post("/verify", userController.handleVerifyEmail);

module.exports = router;
