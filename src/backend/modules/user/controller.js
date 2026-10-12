const userService = require("./service");

const handleRegisterUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const result = await userService.registerUser({ name, email, password });

    // Return 201 Created on successful registration
    res.status(201).json({
      message:
        "User registered successfully. Please check your email to verify your account.",
      data: result,
    });
  } catch (err) {
    // Return 400 Bad Request for validation or duplicate user errors
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
    // 401 Unauthorized for bad credentials
    res
      .status(401)
      .json({ error: { code: "UNAUTHORIZED", message: err.message } });
  }
};

// Add this below handleLoginUser:

const handleVerifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({
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
