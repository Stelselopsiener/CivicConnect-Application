const request = require('supertest');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUserService } = require('../modules/user/service');
const { createUserRoutes } = require('../api/userRoutes');

// API contract tests with an in-memory repository and fake mail sender.
// These do not prove PostgreSQL behaviour or SMTP delivery.
let app, repo, mail, users, tokens, now, logger;
const account = { name: 'New User', email: 'new@example.org', password: 'LongPassword123!' };
const latestCode = () => mail.send.mock.calls.at(-1)[0].text.match(/is: (\d{6})/)[1];
const post = (path, data) => request(app).post(`/api/v1/auth/${path}`).send(data);

afterEach(() => jest.restoreAllMocks());
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  let nextCode = 100000;
  jest.spyOn(crypto, 'randomInt').mockImplementation(() => nextCode++);
  users = new Map(); tokens = new Map(); now = Date.now();
  repo = {
    createUser: jest.fn(async (data) => {
      if (users.has(data.email)) return null;
      const user = { ...data, user_id: users.size + 1, user_type: 'requester', email_verified: false };
      users.set(data.email, user);
      tokens.set(data.email, { hash: data.token_hash, expires: now + data.ttlMinutes * 60000, issued: now, attempts: 0, used: false });
      return { user_id: user.user_id };
    }),
    findUserByEmail: jest.fn(async (email) => users.get(email)),
    replaceVerificationCode: jest.fn(async (email, hash, ttl) => {
      if (!users.has(email) || users.get(email).email_verified || now - tokens.get(email).issued < 60000) return false;
      tokens.set(email, { hash, expires: now + ttl * 60000, issued: now, attempts: 0, used: false });
      return true;
    }),
    consumeVerificationCode: jest.fn(async (email, hash) => {
      const token = tokens.get(email);
      if (!token || token.used || token.expires <= now || token.attempts >= 5) return false;
      if (token.hash !== hash) { token.attempts++; return false; }
      token.used = true; users.get(email).email_verified = true; return true;
    }),
  };
  mail = { send: jest.fn(async () => {}) }; logger = { warn: jest.fn() };
  const service = createUserService({ repo, mailSender: mail, bcrypt, jwt,
    jwtSecret: 'unit-test-jwt-secret', verificationSecret: 'unit-test-verification-secret-32-chars', logger });
  app = express(); app.use(express.json());
  const routes = createUserRoutes(service);
  app.use('/api/v1/auth', routes); app.use('/api/v1/users', routes);
});

test('register sends a six-digit code only through MailSender and stores hashes', async () => {
  const res = await post('register', { ...account, email: ' NEW@example.org ' });
  expect(res.status).toBe(201);
  const code = latestCode();
  expect(code).toMatch(/^\d{6}$/);
  expect(mail.send.mock.calls[0][0].to).toBe(account.email);
  expect(JSON.stringify(res.body)).not.toContain(code);
  expect(res.body).not.toHaveProperty('data');
  expect(users.get(account.email).password_hash).not.toBe(account.password);
  expect(tokens.get(account.email).hash).toMatch(/^[a-f0-9]{64}$/);
  expect(tokens.get(account.email).hash).not.toBe(code);
  expect(repo.createUser.mock.invocationCallOrder[0]).toBeLessThan(mail.send.mock.invocationCallOrder[0]);
});

test('register -> login refused -> verify -> login succeeds -> replay refused', async () => {
  await post('register', account);
  const code = latestCode();
  const before = await post('login', account);
  expect(before.status).toBe(403); expect(before.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  expect(before.body).not.toHaveProperty('data.token');
  expect((await post('verify-email', { email: account.email, code })).status).toBe(200);
  const login = await post('login', account);
  expect(login.status).toBe(200);
  expect(jwt.verify(login.body.data.token, 'unit-test-jwt-secret').user_type).toBe('requester');
  expect((await post('verify-email', { email: account.email, code })).status).toBe(400);
});

test.each(['12345', '1234567', 'abcdef', 123456])('rejects malformed code %p', async (code) => {
  expect((await post('verify-email', { email: account.email, code })).status).toBe(400);
  expect(repo.consumeVerificationCode).not.toHaveBeenCalled();
});

test('verification is scoped to email, so another address cannot redeem a code', async () => {
  await post('register', account);
  expect((await post('verify-email', { email: 'other@example.org', code: latestCode() })).status).toBe(400);
  expect(users.get(account.email).email_verified).toBe(false);
});

test('resend waits 60 seconds; replaces old code without replacing password', async () => {
  await post('register', account); const first = latestCode(); const password = users.get(account.email).password_hash;
  await post('resend-verification', { email: account.email }); expect(mail.send).toHaveBeenCalledTimes(1);
  now += 61000;
  await post('resend-verification', { email: account.email }); expect(mail.send).toHaveBeenCalledTimes(2);
  expect((await post('verify-email', { email: account.email, code: first })).status).toBe(400);
  expect((await post('verify-email', { email: account.email, code: latestCode() })).status).toBe(200);
  expect(users.get(account.email).password_hash).toBe(password);
});

test('expired codes cannot activate an account', async () => {
  await post('register', account); now += 600000;
  expect((await post('verify-email', { email: account.email, code: latestCode() })).status).toBe(400);
});

test('five incorrect attempts disable the code, even when the next input is correct', async () => {
  await post('register', account); const correct = latestCode(); const wrong = correct === '000000' ? '999999' : '000000';
  for (let i = 0; i < 5; i++) expect((await post('verify-email', { email: account.email, code: wrong })).status).toBe(400);
  expect((await post('verify-email', { email: account.email, code: correct })).status).toBe(400);
});

test('mail failure preserves the pending account and resend can recover', async () => {
  mail.send.mockRejectedValueOnce(new Error('SMTP secret error details'));
  expect((await post('register', account)).status).toBe(201);
  expect(users.get(account.email).email_verified).toBe(false);
  expect(logger.warn.mock.calls.flat().join(' ')).not.toContain('secret');
  now += 61000; await post('resend-verification', { email: account.email });
  expect((await post('verify-email', { email: account.email, code: latestCode() })).status).toBe(200);
});

test('duplicate registration has the same response and does not change credentials', async () => {
  const first = await post('register', account); const password = users.get(account.email).password_hash;
  const second = await post('register', { ...account, password: 'DifferentPassword!' });
  expect(second.status).toBe(first.status); expect(second.body).toEqual(first.body);
  expect(users.get(account.email).password_hash).toBe(password);
  expect(mail.send.mock.calls.at(-1)[0].subject).toBe('CivicConnect registration notice');
});

test.each(['', 'short', 'x'.repeat(65)])('rejects password boundary %p', async (password) => {
  expect((await post('register', { ...account, password })).status).toBe(400);
  expect(repo.createUser).not.toHaveBeenCalled();
});

test('rate limits email requests across both route aliases', async () => {
  for (let i = 0; i < 5; i++) await post('resend-verification', { email: account.email });
  const res = await request(app).post('/api/v1/users/resend-verification').send({ email: account.email });
  expect(res.status).toBe(429);
});

test('unknown and verified addresses get the same resend response', async () => {
  const unknown = await post('resend-verification', { email: 'absent@example.org' });
  await post('register', account); await post('verify-email', { email: account.email, code: latestCode() });
  const verified = await post('resend-verification', { email: account.email });
  expect(verified.body).toEqual(unknown.body); expect(mail.send).toHaveBeenCalledTimes(1);
});

test('database failure returns no internal SQL information and sends no mail', async () => {
  repo.createUser.mockRejectedValueOnce(new Error('SQL password_hash internal failure'));
  const res = await post('register', account);
  expect(res.status).toBe(500); expect(JSON.stringify(res.body)).not.toContain('password_hash');
  expect(mail.send).not.toHaveBeenCalled();
});

test('a leading-zero code is preserved as a six-character string', async () => {
  crypto.randomInt.mockReturnValueOnce(42);
  await post('register', account);
  expect(latestCode()).toBe('000042');
  expect((await post('verify-email', { email: account.email, code: '000042' })).status).toBe(200);
});

test.each([8, 64])('accepts the valid password boundary of %i characters', async (length) => {
  expect((await post('register', { ...account, password: 'x'.repeat(length) })).status).toBe(201);
});

test('non-email unique violations are errors, not false successful registrations', async () => {
  repo.createUser.mockRejectedValueOnce(Object.assign(new Error('private SQL detail'), { code: '23505' }));
  const result = await post('register', account);
  expect(result.status).toBe(500);
  expect(mail.send).not.toHaveBeenCalled();
  expect(JSON.stringify(result.body)).not.toContain('private SQL detail');
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining('23505'));
});
