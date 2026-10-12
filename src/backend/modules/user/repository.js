const pool = require("../../config/db");

const createUser = async (userData) => {
  // We use a database transaction to ensure both the user and their token
  // are created successfully, or neither are saved.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Note: "user" is a reserved word in Postgres, so we wrap it in quotes
    const insertUserQuery = `
      INSERT INTO "user" (name, email, password_hash, user_type, email_verified)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, email, email_verified;
    `;
    const userValues = [
      userData.name,
      userData.email,
      userData.password_hash,
      "requester", // Default role per your PED
      false,
    ];
    const userResult = await client.query(insertUserQuery, userValues);
    const newUser = userResult.rows[0];

    const insertTokenQuery = `
      INSERT INTO verification_token (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3);
    `;
    // Set expiry to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await client.query(insertTokenQuery, [
      newUser.user_id,
      userData.token_hash,
      expiresAt,
    ]);

    await client.query("COMMIT");
    return newUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const findUserByEmail = async (email) => {
  // UPDATED: Joins the category tables so the frontend can display the department name
  const query = `
    SELECT 
      u.*, 
      c.name AS category 
    FROM "user" u
    LEFT JOIN staff_category sc ON u.user_id = sc.user_id
    LEFT JOIN category c ON sc.category_id = c.category_id
    WHERE u.email = $1;
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0]; // Returns undefined if no user is found
};

const findTokenByHash = async (tokenHash) => {
  const query = `SELECT * FROM verification_token WHERE token_hash = $1;`;
  const { rows } = await pool.query(query, [tokenHash]);
  return rows[0];
};

const markUserVerified = async (userId, tokenId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE "user" SET email_verified = true WHERE user_id = $1;`,
      [userId],
    );
    await client.query(
      `UPDATE verification_token SET used_at = NOW() WHERE token_id = $1;`,
      [tokenId],
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createUser,
  findUserByEmail,
  findTokenByHash,
  markUserVerified,
};
