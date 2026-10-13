const bcrypt = require("bcrypt");
const crypto = require("crypto");
const userRepo = require("./repository");
const jwt = require("jsonwebtoken");

const registerUser = async (userData) => {
  const { name, email, password } = userData;

  // 1. Validate mandatory fields
  if (!name || !email || !password) {
    throw new Error("Name, email, and password are required.");
  }

  // 2. Check if user already exists
  const existingUser = await userRepo.findUserByEmail(email);
  if (existingUser) {
    throw new Error("A user with this email already exists.");
  }

  // 3. Hash the password (cost factor of 10 is standard)
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // 4. Generate the verification token (CR-008)
  const plainToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest("hex");

  // 5. Save everything via the repository
  const newUser = await userRepo.createUser({
    name,
    email,
    password_hash: passwordHash,
    token_hash: tokenHash,
  });

  return {
    user: newUser,
    verification_token: plainToken,
  };
};

const loginUser = async (email, password) => {
  // 1. Find the user by email
  const user = await userRepo.findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  // 2. Compare the provided password with the stored hash
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error("Invalid email or password.");
  }

  // FIX FOR TC-006: Block login if email is not verified
  if (user.email_verified === false) {
    const error = new Error("EMAIL_NOT_VERIFIED");
    error.code = "EMAIL_NOT_VERIFIED";
    throw error;
  }

  // 3. Generate the JWT (expires in 24 hours)
  const token = jwt.sign(
    {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      category: user.category,
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" },
  );

  return {
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      category: user.category,
    },
    token,
  };
};

const verifyEmail = async (plainToken) => {
  // 1. Hash the incoming plain token to match what is in the database
  const tokenHash = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest("hex");

  // 2. Find the token record
  const tokenRecord = await userRepo.findTokenByHash(tokenHash);

  if (!tokenRecord) {
    throw new Error("Invalid verification token.");
  }

  if (tokenRecord.used_at) {
    throw new Error("This token has already been used.");
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    throw new Error("This verification token has expired.");
  }

  // 3. Mark the user as verified
  await userRepo.markUserVerified(tokenRecord.user_id, tokenRecord.token_id);

  return { success: true, message: "Email successfully verified." };
};

module.exports = { registerUser, loginUser, verifyEmail };
