const crypto = require('node:crypto');

const TTL_MINUTES = 10;

const GENERIC = {
  message:
    'If this address is eligible, check its inbox for a CivicConnect email. You can request a new code if needed.'
};

const fault = (status, code, message) =>
  Object.assign(new Error(message), { status, code });

function normaliseEmail(value) {
  if (
    typeof value !== 'string' ||
    value.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  ) {
    throw fault(400, 'BAD_REQUEST', 'Enter a valid email address.');
  }

  return value.trim().toLowerCase();
}

// Mail-provider error categories that are safe to log (no recipient, code or provider body).
const SAFE_MAIL_CODE = /^(EAUTH|ECONNECTION|ETIMEDOUT|ESOCKET|EENVELOPE|EMESSAGE|EBREVO_\d{3})$/;

// Dependencies are supplied once in server.js; no SMTP/HTTP mail code or SQL in business logic.
// mailSender is any MailSender adapter (BrevoMailSender in production, NodemailerMailSender locally).
function createUserService({
  repo,
  mailSender,
  bcrypt,
  jwt,
  jwtSecret,
  verificationSecret,
  logger = console
}) {
  if (!jwtSecret || !verificationSecret || verificationSecret.length < 32) {
    throw new Error(
      'JWT_SECRET and a separate VERIFICATION_SECRET (at least 32 characters) are required.'
    );
  }

  // Codes are stored only as an HMAC bound to the email address.
  const hashCode = (email, code) =>
    crypto
      .createHmac('sha256', verificationSecret)
      .update(`${email}\0${code}`)
      .digest('hex');

  const newCode = () =>
    String(crypto.randomInt(0, 1000000)).padStart(6, '0');

  const send = async (message) => {
    try {
      await mailSender.send(message);
      logger.info?.(
        'AUTH_MAIL_ACCEPTED: the mail provider accepted a message; inbox delivery is not guaranteed.'
      );
    } catch (error) {
      // Never log the provider error body, recipient, password or code.
      // Pending users can retry via "request a new code".
      const safeCode = SAFE_MAIL_CODE.test(error?.code || '') ? error.code : 'UNKNOWN';
      logger.warn(
        `AUTH_MAIL_FAILED (${safeCode}): check the mail provider settings; pending users can request another code.`
      );
    }
  };

  const sendCode = (email, code) =>
    send({
      to: email,
      subject: 'Your CivicConnect verification code',
      text:
        `Your CivicConnect verification code is: ${code}\n\n` +
        `Enter this code on the Confirm your email screen. ` +
        `It expires in ${TTL_MINUTES} minutes and works once. ` +
        `A new code replaces the previous code.\n\n` +
        `If you did not register, ignore this email.`,
      html:
        `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;color:#1f2937">` +
        `<h2 style="margin:0 0 16px">Confirm your CivicConnect email</h2>` +
        `<p>Your verification code is:</p>` +
        `<p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">${code}</p>` +
        `<p>Enter this code on the <strong>Confirm your email</strong> screen. ` +
        `It expires in ${TTL_MINUTES} minutes and works once. A new code replaces the previous code.</p>` +
        `<p style="color:#6b7280;font-size:13px">If you did not register, ignore this email.</p></div>`
    });

  return {
    // Registration creates an UNVERIFIED account and emails a six-digit code (PED D13/D16).
    async registerUser({ name, email, password }) {
      email = normaliseEmail(email);

      if (
        typeof name !== 'string' ||
        !name.trim() ||
        name.trim().length > 100 ||
        typeof password !== 'string' ||
        password.length < 8 ||
        password.length > 64 ||
        Buffer.byteLength(password, 'utf8') > 72
      ) {
        throw fault(
          400,
          'BAD_REQUEST',
          'Enter a name (1–100 characters) and a password of 8–64 characters (maximum 72 UTF-8 bytes).'
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const code = newCode();

      // Unique email constraint handles simultaneous registrations without overwriting any account.
      const user = await repo.createUser({
        name: name.trim(),
        email,
        password_hash: passwordHash,
        token_hash: hashCode(email, code),
        ttlMinutes: TTL_MINUTES
      });

      if (!user) {
        throw fault(
          409,
          'ACCOUNT_EXISTS',
          'An account with this email already exists. Please sign in. If you have not verified it yet, request a new verification code.'
        );
      }

      // Sent only after the user and code rows have committed.
      await sendCode(email, code);

      // Never expose the code, hash or user ID.
      return { ...GENERIC };
    },

    async resendVerification(email) {
      email = normaliseEmail(email);
      const code = newCode();
      const issued = await repo.replaceVerificationCode(
        email,
        hashCode(email, code),
        TTL_MINUTES
      );
      if (issued) {
        await sendCode(email, code);
      }
      return { ...GENERIC };
    },

    async verifyEmail({ email, code }) {
      email = normaliseEmail(email);

      if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
        throw fault(
          400,
          'BAD_REQUEST',
          'Enter the six-digit code as shown in your email.'
        );
      }

      if (!(await repo.consumeVerificationCode(email, hashCode(email, code)))) {
        throw fault(
          400,
          'TOKEN_INVALID',
          'The code is incorrect, expired, already used, or has reached its attempt limit. Request a new code.'
        );
      }

      return { message: 'Email confirmed. You can now sign in.' };
    },

    async loginUser(email, password) {
      email = normaliseEmail(email);

      if (typeof password !== 'string' || !password) {
        throw fault(400, 'BAD_REQUEST', 'Password is required.');
      }

      const user = await repo.findUserByEmail(email);

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw fault(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      }

      // Unconfirmed accounts cannot sign in (PED D13).
      if (!user.email_verified) {
        throw fault(403, 'EMAIL_NOT_VERIFIED', 'Confirm your email before signing in.');
      }

      const claims = {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
        category: user.category
      };

      return {
        user: claims,
        token: jwt.sign(claims, jwtSecret, { expiresIn: '24h' })
      };
    }
  };
}

module.exports = { createUserService };
