require('dotenv').config();
const { NodemailerMailSender } = require('../infrastructure/mail/NodemailerMailSender');
(async () => {
  try {
    await new NodemailerMailSender().verify();
    console.log('SMTP connection and authentication succeeded. This does not prove inbox delivery.');
  } catch {
    console.error('SMTP check failed. Check the configured host, port, credentials and network access.');
    process.exitCode = 1;
  }
})();
