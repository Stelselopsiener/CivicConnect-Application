// Picks the MailSender adapter from configuration (composition root helper, PED D11).
// Business code never sees which provider is used: it only calls mailSender.send(...).
//
//   MAIL_PROVIDER=brevo  -> BrevoMailSender (HTTPS API; works on Render)
//   MAIL_PROVIDER=smtp   -> NodemailerMailSender (local Ethereal inbox / hosts that allow SMTP)
//   unset                -> brevo if BREVO_API_KEY is set, otherwise smtp
const { BrevoMailSender } = require('./BrevoMailSender');
const { NodemailerMailSender } = require('./NodemailerMailSender');

function createMailSender(env = process.env) {
  const provider = (env.MAIL_PROVIDER || (env.BREVO_API_KEY ? 'brevo' : 'smtp')).trim().toLowerCase();
  if (provider === 'brevo') return new BrevoMailSender(env);
  if (provider === 'smtp') return new NodemailerMailSender(env);
  throw new Error(`Unknown MAIL_PROVIDER "${provider}". Use "brevo" or "smtp".`);
}

module.exports = { createMailSender };
