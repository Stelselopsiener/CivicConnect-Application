const {BrevoMailSender, parseFrom} = require('../../infrastructure/mail/BrevoMailSender');
const {createMailSender} = require('../../infrastructure/mail/createMailSender');
const env = {BREVO_API_KEY:'xkeysib-test', MAIL_FROM:'CivicConnect <noreply@example.com>'};

test('Brevo adapter posts the message to the Brevo HTTPS API with the API key header', async () => {
  const fetch = jest.fn().mockResolvedValue({ok:true, status:201});
  await new BrevoMailSender(env, fetch).send({to:'user@example.org', subject:'Code', text:'Your code is: 123456'});
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe('https://api.brevo.com/v3/smtp/email');
  expect(init.method).toBe('POST');
  expect(init.headers['api-key']).toBe('xkeysib-test');
  expect(JSON.parse(init.body)).toMatchObject({sender:{name:'CivicConnect',email:'noreply@example.com'}, to:[{email:'user@example.org'}], subject:'Code', textContent:'Your code is: 123456'});
});
test('Brevo adapter throws a safe error code when Brevo rejects the message', async () => {
  const fetch = jest.fn().mockResolvedValue({ok:false, status:401});
  await expect(new BrevoMailSender(env, fetch).send({to:'a@b.co', subject:'s', text:'t'})).rejects.toMatchObject({code:'EAUTH'});
  fetch.mockResolvedValue({ok:false, status:400});
  await expect(new BrevoMailSender(env, fetch).send({to:'a@b.co', subject:'s', text:'t'})).rejects.toMatchObject({code:'EBREVO_400'});
});
test('Brevo adapter maps network failures to ECONNECTION', async () => {
  const fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'));
  await expect(new BrevoMailSender(env, fetch).send({to:'a@b.co', subject:'s', text:'t'})).rejects.toMatchObject({code:'ECONNECTION'});
});
test('Brevo adapter requires an API key and a sender', () => {
  expect(() => new BrevoMailSender({MAIL_FROM:'x@y.co'}, jest.fn())).toThrow('BREVO_API_KEY');
  expect(() => new BrevoMailSender({BREVO_API_KEY:'k'}, jest.fn())).toThrow('MAIL_FROM');
});
test('parseFrom accepts bare and named addresses', () => {
  expect(parseFrom('a@b.co', 'CivicConnect')).toEqual({name:'CivicConnect', email:'a@b.co'});
  expect(parseFrom('"Civic" <a@b.co>', 'X')).toEqual({name:'Civic', email:'a@b.co'});
});
test('createMailSender picks Brevo when BREVO_API_KEY is set and SMTP otherwise', () => {
  expect(createMailSender(env).constructor.name).toBe('BrevoMailSender');
  expect(createMailSender({SMTP_HOST:'smtp.dummy.com',SMTP_PORT:'587',SMTP_USER:'u',SMTP_PASS:'p',SMTP_FROM:'f@x.co',NODE_ENV:'test'}).constructor.name).toBe('NodemailerMailSender');
  expect(() => createMailSender({MAIL_PROVIDER:'carrier-pigeon'})).toThrow('Unknown MAIL_PROVIDER');
});
