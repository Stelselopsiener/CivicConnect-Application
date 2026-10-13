jest.mock('../config/db', () => ({ connect: jest.fn() }));
const pool = require('../config/db');
const repo = require('../modules/user/repository');
let client;
beforeEach(() => {
  client = { query: jest.fn(async () => ({ rows: [], rowCount: 0 })), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
});
const queries = () => client.query.mock.calls.map(([sql]) => sql);
const hash = 'a'.repeat(64);
function pendingUserAndToken(storedHash = hash) {
  client.query.mockImplementation(async (sql) => {
    if (sql.startsWith('SELECT user_id')) return { rows: [{ user_id: 1, email_verified: false }] };
    if (sql.startsWith('SELECT token_id')) return { rows: [{ token_id: 2, token_hash: storedHash }] };
    return { rows: [], rowCount: 0 };
  });
}

test('success locks user before token and commits both activation and consumption', async () => {
  pendingUserAndToken(); expect(await repo.consumeVerificationCode('a@example.org', hash)).toBe(true);
  expect(queries()[1]).toContain('FOR UPDATE');
  expect(queries()[2]).toContain('expires_at > NOW() AND failed_attempts < 5');
  expect(queries().some((sql) => sql.includes('SET email_verified = true'))).toBe(true);
  expect(queries().some((sql) => sql.includes('SET used_at = NOW()'))).toBe(true);
  expect(queries().at(-1)).toBe('COMMIT'); expect(client.release).toHaveBeenCalled();
});
test('incorrect guess persists attempt counter and never activates', async () => {
  pendingUserAndToken('b'.repeat(64)); expect(await repo.consumeVerificationCode('a@example.org', hash)).toBe(false);
  expect(queries().some((sql) => sql.includes('failed_attempts = failed_attempts + 1'))).toBe(true);
  expect(queries().some((sql) => sql.includes('SET email_verified'))).toBe(false);
  expect(queries().at(-1)).toBe('COMMIT');
});
test('error between activation and consumption rolls back both', async () => {
  pendingUserAndToken(); const normal = client.query.getMockImplementation();
  client.query.mockImplementation(async (sql, args) => {
    if (sql.includes('SET used_at')) throw new Error('database failure');
    return normal(sql, args);
  });
  await expect(repo.consumeVerificationCode('a@example.org', hash)).rejects.toThrow('database failure');
  expect(queries().at(-1)).toBe('ROLLBACK'); expect(client.release).toHaveBeenCalled();
});
test('resend invalidates earlier codes and inserts replacement in one transaction', async () => {
  pendingUserAndToken(); expect(await repo.replaceVerificationCode('a@example.org', hash, 10)).toBe(true);
  expect(queries().findIndex((sql) => sql.includes('SET used_at'))).toBeLessThan(queries().findIndex((sql) => sql.includes('INSERT INTO verification_token')));
  expect(queries().at(-1)).toBe('COMMIT');
});
test('cooldown suppresses resend writes', async () => {
  pendingUserAndToken(); const normal = client.query.getMockImplementation();
  client.query.mockImplementation(async (sql, args) => sql.startsWith('SELECT 1') ? { rowCount: 1 } : normal(sql, args));
  expect(await repo.replaceVerificationCode('a@example.org', hash, 10)).toBe(false);
  expect(queries().some((sql) => sql.includes('INSERT INTO verification_token'))).toBe(false);
});

test('email conflict creates neither a second account nor a code', async () => {
  const user = await repo.createUser({ name: 'Test', email: 'a@example.org', password_hash: 'fake', token_hash: hash, ttlMinutes: 10 });
  expect(user).toBeNull();
  expect(queries().some((sql) => sql.includes('ON CONFLICT ((LOWER(email))) DO NOTHING'))).toBe(true);
  expect(queries().some((sql) => sql.includes('INSERT INTO verification_token'))).toBe(false);
  expect(queries().at(-1)).toBe('COMMIT');
});
