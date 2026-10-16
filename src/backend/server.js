require("dotenv").config();
const express = require("express");
const cors = require("cors");
const requestRoutes = require("./api/requestRoutes");
const { createUserRoutes } = require("./api/userRoutes");
const { createUserService } = require("./modules/user/service");
const {
  NodemailerMailSender,
} = require("./infrastructure/mail/NodemailerMailSender");
const userRoutes = createUserRoutes(
  createUserService({
    repo: require("./modules/user/repository"),
    mailSender: new NodemailerMailSender(),
    bcrypt: require("bcrypt"),
    jwt: require("jsonwebtoken"),
    jwtSecret: process.env.JWT_SECRET,
    verificationSecret: process.env.VERIFICATION_SECRET,
  }),
);
const staffRoutes = require("./api/staffRoutes");
const adminRoutes = require("./api/adminRoutes"); // or wherever your admin routes are

const app = express();

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

app.use(cors());
app.use(express.json());

app.use("/api/v1/requests", requestRoutes);
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/users", userRoutes); // backwards-compatible route prefix
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/admin", adminRoutes);

const PORT = process.env.PORT || 3000;

// Only listen if the file is run directly (not when imported by Jest)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`The server is running on port ${PORT}`);
  });
}

module.exports = app;
