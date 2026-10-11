const pool = require("../../config/db");

const findRequestsByRequester = async (requesterId) => {
  const query = `
    SELECT 
      service_request_id,
      requester_id,
      category_id,
      title,
      description,
      street_address
    FROM service_request
    WHERE requester_id = $1;
  `;

  const { rows } = await pool.query(query, [requesterId]);
  return rows;
};

const createRequest = async (requestData) => {
  const insertRequestQuery = `
    INSERT INTO service_request (
      requester_id,
      category_id,
      title,
      description,
      start_date,
      end_date,
      street_address
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING service_request_id;
  `;

  const { rows } = await pool.query(insertRequestQuery, [
    requestData.requester_id,
    requestData.category_id,
    requestData.title,
    requestData.description,
    requestData.start_date,
    requestData.end_date,
    requestData.street_address,
  ]);

  return {
    service_request_id: rows[0].service_request_id,
    status: "Pending",
  };
};

const findRequestById = async (requestId) => {
  // 1. Fetch the core request
  const query = `
    SELECT *
    FROM service_request
    WHERE service_request_id = $1;
  `;
  const { rows } = await pool.query(query, [requestId]);
  const request = rows[0];

  if (!request) return null;

  // 2. Fetch the timeline (actions) so the frontend doesn't crash
  const timelineQuery = `
    SELECT 
      a.action_id,
      a.date,
      a.comment,
      ast.name AS status,
      atp.name AS action_type,
      u.name AS performed_by_name,
      staff.name AS assigned_staff_name
    FROM action a
    LEFT JOIN action_status ast ON a.status_id = ast.status_id
    LEFT JOIN action_type atp ON a.action_type_id = atp.action_type_id
    LEFT JOIN "user" u ON a.performed_by = u.user_id
    LEFT JOIN "user" staff ON a.staff_id = staff.user_id
    WHERE a.service_request_id = $1
    ORDER BY a.date ASC, a.action_id ASC;
  `;
  const timelineResult = await pool.query(timelineQuery, [requestId]);

  // Attach the timeline to the request object
  request.timeline = timelineResult.rows;

  // 3. Derive the current status from the latest action (or default to Pending)
  if (request.timeline.length > 0) {
    const latestAction = request.timeline[request.timeline.length - 1];

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

    const rawStatus = (latestAction.status || "").toLowerCase();
    request.status = statusMap[rawStatus] || latestAction.status;
    request.assigned_staff_name = latestAction.assigned_staff_name;
  } else {
    request.status = "Pending";
  }

  return request;
};

const addTimelineAction = async ({
  requestId,
  performedBy,
  newStatus,
  comment,
  actionType,
}) => {
  // Map strict React UI strings back to lowercase database strings
  const dbStatusMap = {
    Pending: "pending",
    Accepted: "accepted",
    Assigned: "assigned",
    "In Progress": "in_progress",
    Completed: "completed",
    Closed: "closed",
    Rejected: "rejected",
  };

  const dbActionMap = {
    "Status change": "status_change",
    "Comment added": "comment",
  };

  const statusName = dbStatusMap[newStatus] || "pending";
  const actionTypeName = dbActionMap[actionType] || "comment";

  const insertActionQuery = `
    INSERT INTO action (service_request_id, performed_by, date, comment, status_id, action_type_id)
    VALUES (
      $1, 
      $2, 
      NOW(), 
      $3,
      (SELECT status_id FROM action_status WHERE name = $4),
      (SELECT action_type_id FROM action_type WHERE name = $5)
    )
    RETURNING action_id;
  `;

  await pool.query(insertActionQuery, [
    requestId,
    performedBy,
    comment,
    statusName,
    actionTypeName,
  ]);
  return true;
};

module.exports = {
  findRequestsByRequester,
  createRequest,
  findRequestById,
  addTimelineAction,
};
