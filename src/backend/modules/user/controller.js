const userService = require("./service");

const handleRegisterUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // FIX 1: TC-005 Password Length BVA
    if (!password || password.length < 8 || password.length > 64) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Password must be between 8 and 64 characters.",
        },
      });
    }

    const result = await userService.registerUser({ name, email, password });

    res.status(201).json({
      message:
        "User registered successfully. Please check your email to verify your account.",
      data: result,
    });
  } catch (err) {
    res
      .status(400)
      .json({ error: { code: "BAD_REQUEST", message: err.message } });
  }
};

const handleLoginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Email and password are required.",
        },
      });
    }

    const result = await userService.loginUser(email, password);

    res.status(200).json({
      message: "Login successful.",
      data: result,
    });
  } catch (err) {
    // FIX 2: TC-006 Email Verification Lock
    // Catch the specific unverified error thrown by your service layer
    if (
      err.message === "EMAIL_NOT_VERIFIED" ||
      err.code === "EMAIL_NOT_VERIFIED"
    ) {
      return res.status(403).json({
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Please confirm your email address before signing in.",
        },
      });
    }

    // Default 401 Unauthorized for bad credentials
    res
      .status(401)
      .json({ error: { code: "UNAUTHORIZED", message: err.message } });
  }
};

const handleVerifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Token is required." },
      });
    }

    const result = await userService.verifyEmail(token);
    res.status(200).json(result);
  } catch (err) {
    res
      .status(400)
      .json({ error: { code: "BAD_REQUEST", message: err.message } });
  }
};

module.exports = { handleRegisterUser, handleLoginUser, handleVerifyEmail };
