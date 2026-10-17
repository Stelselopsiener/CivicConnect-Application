// require('dotenv').config();
// const { NodemailerMailSender } = require('../infrastructure/mail/NodemailerMailSender');
// (async () => {
//   try {
//     await new NodemailerMailSender().verify();
//     console.log('SMTP connection and authentication succeeded. This does not prove inbox delivery.');
//   } catch {
//     console.error('SMTP check failed. Check the configured host, port, credentials and network access.');
//     process.exitCode = 1;
//   }
// })();

require('dotenv').config();
const { createMailSender } = require('../infrastructure/mail/createMailSender');
(async () => {
  try {
    const sender = createMailSender();
    await sender.verify();
    console.log(`${sender.constructor.name}: connection and authentication succeeded. This does not prove inbox delivery.`);
    // Optional real test: MAIL_TEST_TO=you@example.com npm run mail:check
    if (process.env.MAIL_TEST_TO) {
      await sender.send({ to: process.env.MAIL_TEST_TO, subject: 'CivicConnect mail check',
        text: 'If you can read this, CivicConnect email delivery is working.' });
      console.log('Test email accepted by the provider. Check the inbox (and spam folder).');
    }
  } catch (error) {
    console.error(`Mail check failed (${error.code || 'UNKNOWN'}): ${error.message}`);
    process.exitCode = 1;
  }
})();
