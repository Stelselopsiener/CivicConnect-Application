const express = require('express');
const crypto = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const { createUserController } = require('../modules/user/controller');

function createUserRoutes(service) {
  const router = express.Router();
  const controller = createUserController(service);
  const message = { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait 15 minutes and try again.' } };
  const options = { windowMs: 15 * 60 * 1000, standardHeaders: 'draft-8', legacyHeaders: false, message };
  // Bounded windows; default memory store is for a single API process (see setup guide).
  const ipLimit = rateLimit({ ...options, limit: 30 });
  const emailLimit = (limit) => rateLimit({ ...options, limit, keyGenerator: (req) =>
    crypto.createHash('sha256').update(typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase() : 'invalid-email').digest('hex') });
  const mailLimit = emailLimit(5);
  const verificationLimit = emailLimit(10);
  router.use(ipLimit);
  router.post('/register', mailLimit, controller.handleRegisterUser);
  router.post('/login', verificationLimit, controller.handleLoginUser);
  router.post('/verify-email', verificationLimit, controller.handleVerifyEmail);
  router.post('/verify', verificationLimit, controller.handleVerifyEmail); // legacy path, new {email, code} body
  router.post('/resend-verification', mailLimit, controller.handleResendVerification);
  return router;
}
module.exports = { createUserRoutes };


