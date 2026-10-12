const pool = require("../../config/db");

const findWorklist = async (staffId, filters = {}) => {
  const conditions = [
    `sr.category_id IN (SELECT category_id FROM staff_category WHERE user_id = $1)`,
  ];
  const values = [staffId];
  let idx = 2;

  // 1. Handle Status Filter
  if (filters.status) {
    const dbStatusMap = {
      Pending: "pending",
      Accepted: "accepted",
      Assigned: "assigned",
      "In Progress": "in_progress",
      Completed: "completed",
      Closed: "closed",
      Rejected: "rejected",
    };
    const mappedStatus =
      dbStatusMap[filters.status] || filters.status.toLowerCase();
    conditions.push(`a_latest.name = $${idx++}`);
    values.push(mappedStatus);
  }

  // 2. Handle Search Bar
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(`(
      sr.title ILIKE $${idx} OR 
      sr.description ILIKE $${idx} OR 
      sr.street_address ILIKE $${idx} OR 
      CAST(sr.service_request_id AS TEXT) ILIKE $${idx}
    )`);
    values.push(term);
    idx++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // 3. Added 'created_at' and 'actions' arrays to ensure the adapter doesn't crash on formatting
  const query = `
    SELECT 
      sr.service_request_id,
      sr.category_id,
      sr.title,
      sr.description,
      sr.start_date AS created_at,
      sr.end_date,
      sr.street_address,
      a_latest.name AS raw_status,
      act.staff_id AS assigned_staff_id,
      act.date AS last_action_date,
      act.action_id AS last_action_id,
      u.name AS requester_name,
      u.email AS requester_email
    FROM service_request sr
    LEFT JOIN "user" u ON sr.requester_id = u.user_id
    LEFT JOIN LATERAL (
      SELECT a.status_id, a.staff_id, a.date, a.action_id
      FROM action a
      WHERE a.service_request_id = sr.service_request_id
      ORDER BY a.date DESC, a.action_id DESC
      LIMIT 1
    ) act ON true
    LEFT JOIN action_status a_latest ON act.status_id = a_latest.status_id
    ${whereClause}
    ORDER BY sr.service_request_id DESC;
  `;

  const { rows } = await pool.query(query, values);

  const statusMap = {
    pending: "Pending",
    accepted: "Accepted",
    assigned: "Assigned",
    in_progress: "In Progress",
    completed: "Completed",
    closed: "Closed",
    rejected: "Rejected",
  };

  return rows.map((row) => {
    const mappedStatus =
      statusMap[(row.raw_status || "").toLowerCase()] || "Pending";
    const actions = row.last_action_date
      ? [
          {
            action_id: row.last_action_id,
            date: row.last_action_date,
          },
        ]
      : [];

    return { ...row, status: mappedStatus, actions };
  });
};

const findStaffByCategory = async (categoryId) => {
  const query = `
    SELECT u.user_id, u.name, u.email
    FROM "user" u
    INNER JOIN staff_category sc ON u.user_id = sc.user_id
    WHERE sc.category_id = $1 AND u.user_type = 'staff';
  `;
  const { rows } = await pool.query(query, [categoryId]);
  return rows;
};

const assignRequest = async (requestId, staffId, performedBy) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertActionQuery = `
      INSERT INTO action (service_request_id, staff_id, performed_by, date, comment, status_id, action_type_id)
      VALUES ($1, $2, $3, NOW(), 'Assigned request to staff', 
      (SELECT status_id FROM action_status WHERE name = 'accepted'),
      (SELECT action_type_id FROM action_type WHERE name = 'assigned'))
      RETURNING action_id;
    `;
    await client.query(insertActionQuery, [requestId, staffId, performedBy]);

    await client.query("COMMIT");
    return {
      service_request_id: requestId,
      assigned_to: staffId,
      status: "Accepted",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateCategory = async (requestId, newCategoryId, performedBy) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE service_request SET category_id = $1 WHERE service_request_id = $2;`,
      [newCategoryId, requestId],
    );

    const insertActionQuery = `
      INSERT INTO action (service_request_id, performed_by, date, comment, status_id, action_type_id)
      VALUES ($1, $2, NOW(), 'Corrected category',
      (SELECT status_id FROM action_status WHERE name = 'in_progress'),
      (SELECT action_type_id FROM action_type WHERE name = 'category_update'))
      RETURNING action_id;
    `;
    await client.query(insertActionQuery, [requestId, performedBy]);

    await client.query("COMMIT");
    return { service_request_id: requestId, category_id: newCategoryId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  findWorklist,
  findStaffByCategory,
  assignRequest,
  updateCategory,
};
