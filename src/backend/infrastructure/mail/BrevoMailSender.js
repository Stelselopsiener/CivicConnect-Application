// MailSender adapter (PED D11/D13, Adapter pattern) for Brevo's transactional email HTTP API.
//
// Why HTTP instead of SMTP: Render (and most free PaaS hosts) block outbound SMTP ports
// 25/465/587, so Nodemailer cannot connect from the deployed API. Brevo's REST API is plain
// HTTPS on port 443, which every host allows. Same interface as NodemailerMailSender:
//   send({ to, subject, text, html? }) -> resolves when Brevo accepts the message.
//
// Uses Node's built-in fetch (Node 18+), so no extra npm dependency is needed.

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_ACCOUNT_URL = 'https://api.brevo.com/v3/account';
const TIMEOUT_MS = 10000;

// Accepts "noreply@example.com" or "CivicConnect <noreply@example.com>".
function parseFrom(value, fallbackName) {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  if (match) return { name: match[1].replace(/^"|"$/g, '') || fallbackName, email: match[2].trim() };
  return { name: fallbackName, email: value.trim() };
}

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

class BrevoMailSender {
  constructor(env = process.env, fetchImpl = globalThis.fetch) {
    const from = env.MAIL_FROM || env.SMTP_FROM;
    if (!env.BREVO_API_KEY) throw new Error('BREVO_API_KEY is required.');
    if (!from) throw new Error('MAIL_FROM is required (a sender address verified in Brevo).');
    if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable; use Node.js 18 or newer.');
    this.apiKey = env.BREVO_API_KEY;
    this.sender = parseFrom(from, env.MAIL_FROM_NAME || 'CivicConnect');
    this.fetch = fetchImpl;
  }

  async request(url, init) {
    try {
      return await this.fetch(url, {
        ...init,
        headers: { accept: 'application/json', 'api-key': this.apiKey, ...init?.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      // Network failure or timeout. Only a safe category leaves this adapter.
      throw Object.assign(new Error('Brevo could not be reached.'),
        { code: error?.name === 'TimeoutError' ? 'ETIMEDOUT' : 'ECONNECTION' });
    }
  }

  async send({ to, subject, text, html }) {
    const response = await this.request(BREVO_SEND_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: this.sender,
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html || `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
      }),
    });
    if (!response.ok) {
      // 401 = bad API key, 400 = unverified sender / bad payload, 402/403 = account limit or not activated.
      // The response body is not attached: it can echo the recipient.
      const code = response.status === 401 ? 'EAUTH' : `EBREVO_${response.status}`;
      throw Object.assign(new Error(`Brevo rejected the message (HTTP ${response.status}).`), { code });
    }
  }

  // Used by `npm run mail:check`: confirms the API key works without sending an email.
  async verify() {
    const response = await this.request(BREVO_ACCOUNT_URL, { method: 'GET' });
    if (!response.ok) {
      throw Object.assign(new Error(`Brevo API key check failed (HTTP ${response.status}).`),
        { code: response.status === 401 ? 'EAUTH' : `EBREVO_${response.status}` });
    }
    return true;
  }
}

module.exports = { BrevoMailSender, parseFrom };
