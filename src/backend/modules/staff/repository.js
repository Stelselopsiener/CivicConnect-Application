const pool = require("../../config/db");

/**
 *
 * Status is dynamically derived from the latest recorded row in the action entity (PED §8.1.1).
 */
const findWorklist = async (staffId, filters = {}) => {
  let query = `
    SELECT 
      sr.service_request_id,
      sr.category_id,
      sr.title,
      sr.description,
      sr.start_date,
      sr.end_date,
      sr.street_address,
      a_latest.name AS status,
      act.staff_id AS assigned_staff_id
    FROM service_request sr
    LEFT JOIN LATERAL (
      SELECT a.status_id, a.staff_id
      FROM action a
      WHERE a.service_request_id = sr.service_request_id
      ORDER BY a.date DESC, a.action_id DESC
      LIMIT 1
    ) act ON true
    LEFT JOIN action_status a_latest ON act.status_id = a_latest.status_id
    WHERE sr.category_id IN (
      SELECT category_id FROM staff_category WHERE user_id = $1
    )
  `;

  const values = [staffId];

  if (filters.status) {
    values.push(filters.status);
    query += ` AND a_latest.name = $${values.length}`;
  }

  query += ` ORDER BY sr.service_request_id DESC;`;

  const { rows } = await pool.query(query, values);

  // Safely map raw database status strings to the strict CivicConnect UI strings
  const statusMap = {
    pending: "Pending",
    accepted: "Accepted",
    assigned: "Assigned",
    in_progress: "In Progress",
    completed: "Completed",
    closed: "Closed",
    rejected: "Rejected",
  };

  // Map over the results and overwrite the lowercase status with the capitalized one
  return rows.map((row) => {
    const rawStatus = (row.status || "pending").toLowerCase();
    return {
      ...row,
      status: statusMap[rawStatus] || row.status,
    };
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

/**
 * Commits the change and inserts an action audit row inside an atomic transaction (ASR-007, ASR-009, D12).
 */
const assignRequest = async (requestId, staffId, performedBy) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert action record linking assigned staff member (staff_id) and acting user (performed_by)
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
      // FIX: Capitalized "Accepted" to match CivicConnect UI lifecycle
      status: "Accepted",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Updates service_request.category_id and records the audit log in action (ASR-009).
 */
const updateCategory = async (requestId, newCategoryId, performedBy) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Update the category directly on the service_request record
    await client.query(
      `UPDATE service_request SET category_id = $1 WHERE service_request_id = $2;`,
      [newCategoryId, requestId],
    );

    // Record an audit action noting the category modification
    // FOR NOW WHEN A CATEGORY UPDATE IS MADE, THE STATUS IS PENDING
    const insertActionQuery = `
      INSERT INTO action (service_request_id, performed_by, date, comment, status_id, action_type_id)
      VALUES ($1, $2, NOW(), 'Corrected category',
      (SELECT status_id FROM action_status WHERE name = 'in_progress'),
      (SELECT action_type_id FROM action_type WHERE name = 'category_update'))
      RETURNING action_id;
    `;
    await client.query(insertActionQuery, [requestId, performedBy]);

    await client.query("COMMIT");
    return {
      service_request_id: requestId,
      category_id: newCategoryId,
    };
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
