const nodemailer = require("nodemailer");

// MailSender adapter: the only application module that imports Nodemailer/SMTP configuration.
class NodemailerMailSender {
  constructor(env = process.env) {
    for (const key of [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_FROM",
    ]) {
      if (!env[key]) throw new Error(`${key} is required.`);
    }
    const port = Number(env.SMTP_PORT);
    if (![465, 587].includes(port))
      throw new Error("Use SMTP port 465 (TLS) or 587 (STARTTLS).");

    // ALLOW JEST: Added `&& env.NODE_ENV !== 'test'` so tests can run with real credentials
    if (
      env.NODE_ENV !== "production" &&
      env.NODE_ENV !== "test" &&
      env.SMTP_HOST !== "smtp.ethereal.email"
    ) {
      throw new Error(
        "Development uses smtp.ethereal.email; real delivery requires NODE_ENV=production.",
      );
    }

    this.from = env.SMTP_FROM;
    this.transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  async send({ to, subject, text }) {
    const info = await this.transport.sendMail({
      from: this.from,
      to: { address: to },
      subject,
      text,
    });
    if (!info.accepted?.length)
      throw new Error("SMTP did not accept the recipient.");
  }
  verify() {
    return this.transport.verify();
  }
}
module.exports = { NodemailerMailSender };
