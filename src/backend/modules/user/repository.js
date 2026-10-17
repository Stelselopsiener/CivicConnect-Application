// const crypto = require('node:crypto');
// const pool = require('../../config/db');

// async function transaction(work) {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
//     const result = await work(client);
//     await client.query('COMMIT');
//     return result;
//   } catch (error) {
//     await client.query('ROLLBACK');
//     throw error;
//   } finally { client.release(); }
// }

// async function insertCode(client, userId, hash, ttlMinutes) {
//   await client.query(`INSERT INTO verification_token (user_id, token_hash, expires_at, issued_at, failed_attempts)
//     VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'), NOW(), 0)`, [userId, hash, ttlMinutes]);
// }

// // const createUser = (data) => transaction(async (client) => { PREV CODE
// //   const { rows } = await client.query(`INSERT INTO "user" (name, email, password_hash, user_type, email_verified)
// //     VALUES ($1, $2, $3, 'requester', false)
// //     ON CONFLICT ((LOWER(email))) DO NOTHING RETURNING user_id`, [data.name, data.email, data.password_hash]);
// //   if (!rows.length) return null; // Only an email conflict is ignored.
// //   await insertCode(client, rows[0].user_id, data.token_hash, data.ttlMinutes);
// //   return rows[0];
// // });


// const createUser = (data) => transaction(async (client) => {
//   const { rows } = await client.query(`
//     INSERT INTO "user" (name, email, password_hash, user_type, email_verified)
//     VALUES ($1, $2, $3, 'requester', true)
//     ON CONFLICT ((LOWER(email))) DO NOTHING
//     RETURNING user_id
//   `, [data.name, data.email, data.password_hash]);

//   if (!rows.length) return null;

//   // Email verification deferred to next milestone.
//   // await insertCode(
//   //   client,
//   //   rows[0].user_id,
//   //   data.token_hash,
//   //   data.ttlMinutes
//   // );

//   return rows[0];
// });



// const findUserByEmail = async (email) => {
//   const { rows } = await pool.query(`SELECT u.*, c.name AS category FROM "user" u
//     LEFT JOIN staff_category sc ON u.user_id = sc.user_id
//     LEFT JOIN category c ON sc.category_id = c.category_id
//     WHERE LOWER(u.email) = $1`, [email]);
//   return rows[0];
// };

// const replaceVerificationCode = (email, hash, ttlMinutes) => transaction(async (client) => {
//   // Same user-row lock in resend and verify serialises both operations across API instances.
//   const { rows } = await client.query('SELECT user_id, email_verified FROM "user" WHERE LOWER(email) = $1 FOR UPDATE', [email]);
//   const user = rows[0];
//   if (!user || user.email_verified) return false;
//   const recent = await client.query(`SELECT 1 FROM verification_token
//     WHERE user_id = $1 AND issued_at > NOW() - INTERVAL '60 seconds' LIMIT 1`, [user.user_id]);
//   if (recent.rowCount) return false;
//   await client.query('UPDATE verification_token SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.user_id]);
//   await insertCode(client, user.user_id, hash, ttlMinutes);
//   return true;
// });

// const consumeVerificationCode = (email, hash) => transaction(async (client) => {
//   const userResult = await client.query('SELECT user_id, email_verified FROM "user" WHERE LOWER(email) = $1 FOR UPDATE', [email]);
//   const user = userResult.rows[0];
//   if (!user || user.email_verified) return false;
//   const { rows } = await client.query(`SELECT token_id, token_hash FROM verification_token
//     WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW() AND failed_attempts < 5
//     ORDER BY issued_at DESC, token_id DESC LIMIT 1 FOR UPDATE`, [user.user_id]);
//   const token = rows[0];
//   if (!token) return false;
//   const stored = Buffer.from(token.token_hash, 'hex');
//   const supplied = Buffer.from(hash, 'hex');
//   if (stored.length !== supplied.length || !crypto.timingSafeEqual(stored, supplied)) {
//     // Commit failed attempts too; throwing here would roll back the protection.
//     await client.query('UPDATE verification_token SET failed_attempts = failed_attempts + 1 WHERE token_id = $1', [token.token_id]);
//     return false;
//   }
//   await client.query('UPDATE "user" SET email_verified = true WHERE user_id = $1', [user.user_id]);
//   await client.query('UPDATE verification_token SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.user_id]);
//   return true;
// });

// module.exports = { createUser, findUserByEmail, replaceVerificationCode, consumeVerificationCode };

const crypto = require('node:crypto');
const pool = require('../../config/db');

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function insertCode(client, userId, hash, ttlMinutes) {
  await client.query(`INSERT INTO verification_token (user_id, token_hash, expires_at, issued_at, failed_attempts)
    VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'), NOW(), 0)`, [userId, hash, ttlMinutes]);
}

// Creates an unverified requester plus its first verification code in one transaction (PED D13).
const createUser = (data) => transaction(async (client) => {
  const { rows } = await client.query(`INSERT INTO "user" (name, email, password_hash, user_type, email_verified)
    VALUES ($1, $2, $3, 'requester', false)
    ON CONFLICT ((LOWER(email))) DO NOTHING RETURNING user_id`, [data.name, data.email, data.password_hash]);
  if (!rows.length) return null; // Only an email conflict is ignored.
  await insertCode(client, rows[0].user_id, data.token_hash, data.ttlMinutes);
  return rows[0];
});

const findUserByEmail = async (email) => {
  const { rows } = await pool.query(`SELECT u.*, c.name AS category FROM "user" u
    LEFT JOIN staff_category sc ON u.user_id = sc.user_id
    LEFT JOIN category c ON sc.category_id = c.category_id
    WHERE LOWER(u.email) = $1`, [email]);
  return rows[0];
};

const replaceVerificationCode = (email, hash, ttlMinutes) => transaction(async (client) => {
  // Same user-row lock in resend and verify serialises both operations across API instances.
  const { rows } = await client.query('SELECT user_id, email_verified FROM "user" WHERE LOWER(email) = $1 FOR UPDATE', [email]);
  const user = rows[0];
  if (!user || user.email_verified) return false;
  const recent = await client.query(`SELECT 1 FROM verification_token
    WHERE user_id = $1 AND issued_at > NOW() - INTERVAL '60 seconds' LIMIT 1`, [user.user_id]);
  if (recent.rowCount) return false;
  await client.query('UPDATE verification_token SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.user_id]);
  await insertCode(client, user.user_id, hash, ttlMinutes);
  return true;
});

const consumeVerificationCode = (email, hash) => transaction(async (client) => {
  const userResult = await client.query('SELECT user_id, email_verified FROM "user" WHERE LOWER(email) = $1 FOR UPDATE', [email]);
  const user = userResult.rows[0];
  if (!user || user.email_verified) return false;
  const { rows } = await client.query(`SELECT token_id, token_hash FROM verification_token
    WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW() AND failed_attempts < 5
    ORDER BY issued_at DESC, token_id DESC LIMIT 1 FOR UPDATE`, [user.user_id]);
  const token = rows[0];
  if (!token) return false;
  const stored = Buffer.from(token.token_hash, 'hex');
  const supplied = Buffer.from(hash, 'hex');
  if (stored.length !== supplied.length || !crypto.timingSafeEqual(stored, supplied)) {
    // Commit failed attempts too; throwing here would roll back the protection.
    await client.query('UPDATE verification_token SET failed_attempts = failed_attempts + 1 WHERE token_id = $1', [token.token_id]);
    return false;
  }
  await client.query('UPDATE "user" SET email_verified = true WHERE user_id = $1', [user.user_id]);
  await client.query('UPDATE verification_token SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.user_id]);
  return true;
});

module.exports = { createUser, findUserByEmail, replaceVerificationCode, consumeVerificationCode };
