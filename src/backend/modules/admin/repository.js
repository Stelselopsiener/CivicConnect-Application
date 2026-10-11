const pool = require("../../config/db");

const findAllRequests = async ({
  status,
  category,
  category_id,
  search,
  start_date,
  end_date,
  limit = 50,
  offset = 0,
} = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  const STATUS_UI_TO_DB = {
    Pending: "pending",
    Accepted: "accepted",
    "In Progress": "in_progress",
    Completed: "completed",
    Closed: "closed",
    Rejected: "rejected",
    Cancelled: "cancelled",
  };

  if (status) {
    const dbStatus =
      STATUS_UI_TO_DB[status] ??
      String(status).toLowerCase().replace(/\s+/g, "_");
    conditions.push(`latest.status_name = $${idx++}`);
    values.push(dbStatus);
  }

  if (category) {
    conditions.push(`LOWER(c.name) = LOWER($${idx++})`);
    values.push(category);
  } else if (category_id) {
    conditions.push(`sr.category_id = $${idx++}`);
    values.push(category_id);
  }

  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    conditions.push(`(
      sr.title ILIKE $${idx}
      OR sr.street_address ILIKE $${idx}
      OR CAST(sr.service_request_id AS TEXT) ILIKE $${idx}
      OR u.name ILIKE $${idx}
    )`);
    values.push(term);
    idx++;
  }

  if (start_date) {
    conditions.push(`sr.start_date >= $${idx++}::timestamptz`);
    values.push(`${start_date}T00:00:00.000Z`);
  }
  if (end_date) {
    conditions.push(`sr.start_date < ($${idx++}::date + INTERVAL '1 day')`);
    values.push(end_date);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(limit, offset);

  const query = `
    SELECT
      sr.service_request_id,
      sr.requester_id,
      sr.category_id,
      c.name AS category,
      sr.title,
      sr.description,
      sr.street_address,
      sr.start_date,
      sr.end_date,
      u.name  AS requester_name,
      u.email AS requester_email,
      COALESCE(latest.status_name, 'pending') AS status,
      latest.action_date,
      latest.comment AS latest_comment,
      -- ADDED: Fetch the assigned staff member for the owner column
      staff_user.user_id AS staff_id,
      staff_user.name    AS staff_name
    FROM service_request sr
    JOIN "user" u ON u.user_id = sr.requester_id
    JOIN category c ON c.category_id = sr.category_id
    LEFT JOIN LATERAL (
      SELECT
        ast.name AS status_name,
        ac.date  AS action_date,
        ac.comment,
        ac.staff_id
      FROM action ac
      JOIN action_status ast ON ast.status_id = ac.status_id
      WHERE ac.service_request_id = sr.service_request_id
      ORDER BY ac.date DESC, ac.action_id DESC
      LIMIT 1
    ) latest ON true
    LEFT JOIN "user" staff_user ON staff_user.user_id = latest.staff_id
    ${where}
    ORDER BY COALESCE(latest.action_date, sr.start_date) DESC
    LIMIT $${idx++} OFFSET $${idx}
  `;

  const { rows } = await pool.query(query, values);
  return rows;
};

/** Rows for Service overview aggregates */
const getOverviewRows = async ({ start_date, end_date, category } = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (start_date) {
    conditions.push(`sr.start_date >= $${idx++}::timestamptz`);
    values.push(`${start_date}T00:00:00.000Z`);
  }
  if (end_date) {
    conditions.push(`sr.start_date < ($${idx++}::date + INTERVAL '1 day')`);
    values.push(end_date);
  }
  if (category) {
    conditions.push(`LOWER(c.name) = LOWER($${idx++})`);
    values.push(category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    WITH base AS (
      SELECT
        sr.service_request_id,
        c.name AS category,
        -- FIXED: Normalize to lowercase so case-matching never fails
        COALESCE(LOWER(ast.name), 'pending') AS status_name,
        COALESCE(
          (
            SELECT MIN(ac2.date)
            FROM action ac2
            WHERE ac2.service_request_id = sr.service_request_id
          ),
          sr.start_date
        ) AS submitted_at,
        (
          SELECT MIN(ac3.date)
          FROM action ac3
          JOIN action_status ast3 ON ast3.status_id = ac3.status_id
          WHERE ac3.service_request_id = sr.service_request_id
            AND LOWER(ast3.name) = 'completed'
        ) AS completed_at
      FROM service_request sr
      JOIN category c ON c.category_id = sr.category_id
      LEFT JOIN LATERAL (
        SELECT ac.status_id
        FROM action ac
        WHERE ac.service_request_id = sr.service_request_id
        ORDER BY ac.date DESC, ac.action_id DESC
        LIMIT 1
      ) last_ac ON true
      LEFT JOIN action_status ast ON ast.status_id = last_ac.status_id
      ${where}
    ),
    enriched AS (
      SELECT
        *,
        -- FIXED: Use target_days directly from the category table instead of hardcoded case-when!
        (SELECT target_days FROM category WHERE LOWER(name) = LOWER(base.category)) AS target_days,
        status_name IN ('pending', 'accepted', 'in_progress') AS is_open
      FROM base
    )
    SELECT
      service_request_id,
      category,
      status_name,
      is_open,
      submitted_at,
      completed_at,
      CASE
        WHEN is_open
         AND submitted_at IS NOT NULL
         AND NOW() > (submitted_at + (target_days || ' days')::interval)
        THEN true
        ELSE false
      END AS is_overdue,
      CASE
        WHEN is_open
         AND submitted_at IS NOT NULL
         AND NOW() > (submitted_at + (target_days || ' days')::interval)
        THEN GREATEST(
          1,
          CEIL(
            EXTRACT(EPOCH FROM (NOW() - (submitted_at + (target_days || ' days')::interval)))
            / 86400.0
          )
        )::int
        ELSE 0
      END AS days_overdue,
      CASE
        WHEN completed_at IS NOT NULL AND submitted_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (completed_at - submitted_at)) / 86400.0
        ELSE NULL
      END AS days_to_complete
    FROM enriched
  `;

  const { rows } = await pool.query(query, values);
  return rows;
};

const findAuditTrail = async ({ request_id, search, action_type, start_date, limit = 50, offset = 0 } = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (request_id) {
    conditions.push(`na.service_request_id = $${idx++}`);
    values.push(request_id);
  }

  if (action_type && String(action_type).trim()) {
    conditions.push(`LOWER(TRIM(na.action_type)) = LOWER(TRIM($${idx++}))`);
    values.push(action_type);
  }

  if (start_date && String(start_date).trim()) {
    // Treat the date as a calendar day in the DB session, not forced UTC midnight
    conditions.push(`na.date >= ($${idx++}::date)`);
    values.push(start_date);
  }

if (search && String(search).trim()) {
    const rawSearch = String(search).trim();
    const tokens = rawSearch.split(/\s+/).filter(Boolean);
    const digits = rawSearch.replace(/\D/g, "").replace(/^0+/, "") || rawSearch.replace(/\D/g, "");

    const clauses = [];

    for (const token of tokens) {
      const term = `%${token}%`;
      clauses.push(`(
        CAST(na.service_request_id AS TEXT) ILIKE $${idx}
        OR COALESCE(performer.name, '') ILIKE $${idx}
        OR COALESCE(staff.name, '') ILIKE $${idx}
        OR COALESCE(na.comment, '') ILIKE $${idx}
        OR COALESCE(na.action_type, '') ILIKE $${idx}
      )`);
      values.push(term);
      idx += 1;
    }

    // Bare request id (e.g. 28 from "CC-00028")
    if (digits) {
      clauses.push(`CAST(na.service_request_id AS TEXT) = $${idx}`);
      values.push(digits);
      idx += 1;
      clauses.push(`CAST(na.service_request_id AS TEXT) ILIKE $${idx}`);
      values.push(`%${digits}%`);
      idx += 1;
    }

    if (clauses.length) {
      conditions.push(`(${clauses.join(" OR ")})`);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(limit, offset);

  const query = `
    WITH numbered_actions AS (
      SELECT
        ac.action_id,
        ac.service_request_id,
        ac.staff_id,
        ac.performed_by,
        ac.date,
        ac.comment,
        ast.name AS status_name,
        at.name AS action_type,
        LAG(ast.name) OVER (PARTITION BY ac.service_request_id ORDER BY ac.date ASC, ac.action_id ASC) AS prev_status
      FROM action ac
      JOIN action_status ast ON ast.status_id = ac.status_id
      JOIN action_type at ON at.action_type_id = ac.action_type_id
    )
    SELECT
      na.action_id,
      na.service_request_id,
      na.staff_id,
      na.performed_by,
      na.date AS created_at,
      na.comment,
      na.status_name AS status,
      COALESCE(na.prev_status, 'pending') AS previous_status,
      na.status_name AS new_status,
      na.action_type,
      performer.name AS actor_name,
      staff.name AS staff_name
    FROM numbered_actions na
    LEFT JOIN "user" performer ON performer.user_id = na.performed_by
    LEFT JOIN "user" staff ON staff.user_id = na.staff_id
    ${where}
    ORDER BY na.date DESC, na.action_id DESC
    LIMIT $${idx++} OFFSET $${idx}
  `;

  const { rows } = await pool.query(query, values);
  return rows;
};

const findAllUsers = async ({ user_type, limit = 50, offset = 0 } = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (user_type) {
    conditions.push(`u.user_type = $${idx++}`);
    values.push(user_type);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(limit, offset);

  const query = `
    SELECT
      u.user_id,
      u.name,
      u.email,
      u.user_type,
      u.email_verified,
      COALESCE(
        array_agg(c.name ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL),
        '{}'
      ) AS categories
    FROM "user" u
    LEFT JOIN staff_category sc ON sc.user_id = u.user_id
    LEFT JOIN category c ON c.category_id = sc.category_id
    ${where}
    GROUP BY u.user_id, u.name, u.email, u.user_type, u.email_verified
    ORDER BY u.user_id DESC
    LIMIT $${idx++} OFFSET $${idx}
  `;

  const { rows } = await pool.query(query, values);
  return rows;
};

const updateUserType = async (userId, userType) => {
  const query = `
    UPDATE "user"
    SET user_type = $1
    WHERE user_id = $2
    RETURNING user_id, name, email, user_type, email_verified
  `;
  const { rows } = await pool.query(query, [userType, userId]);
  return rows[0];
};

module.exports = {
  findAllRequests,
  getOverviewRows,
  findAuditTrail,
  findAllUsers,
  updateUserType,
};