const pool = require("../../config/db");

const findRequestsByRequester = async (requesterId) => {
  const query = `
    SELECT 
      sr.service_request_id,
      sr.requester_id,
      sr.category_id,
      sr.title,
      sr.description,
      sr.street_address,
      sr.start_date AS created_at,
      a_latest.name AS raw_status,
      act.date AS last_action_date,
      act.action_id AS last_action_id
    FROM service_request sr
    LEFT JOIN LATERAL (
      SELECT a.status_id, a.date, a.action_id
      FROM action a
      WHERE a.service_request_id = sr.service_request_id
      ORDER BY a.date DESC, a.action_id DESC
      LIMIT 1
    ) act ON true
    LEFT JOIN action_status a_latest ON act.status_id = a_latest.status_id
    WHERE sr.requester_id = $1
    ORDER BY sr.service_request_id DESC;
  `;

  const { rows } = await pool.query(query, [requesterId]);

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
      statusMap[(row.raw_status || "").toLowerCase().replace(/\s+/g, "_")] ||
      "Pending";
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

// BENNO
// 1# Change - Ensure start and end date are automatically calculated by the system
// The $5 and $6 in the VALUES section is replaced with CURRENT_DATE and CURRENT_DATE (with more code)
//In the RETURNING section, the start and end date is added
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
    VALUES (
      $1, $2, $3, $4, 
      CURRENT_DATE,
      CURRENT_DATE + (SELECT target_days FROM category WHERE category_id = $2),
      $5
    )
    RETURNING service_request_id, start_date, end_date;
  `;

  const { rows } = await pool.query(insertRequestQuery, [
    requestData.requester_id,
    requestData.category_id,
    requestData.title,
    requestData.description,
    requestData.street_address,
  ]);
  const serviceRequestId = rows[0].service_request_id;

  await pool.query(
    `INSERT INTO action (service_request_id, performed_by, date, comment, status_id, action_type_id)
     VALUES (
       $1, $2, NOW(), $3,
       (SELECT status_id FROM action_status WHERE LOWER(name) = 'pending' LIMIT 1),
       (SELECT action_type_id FROM action_type WHERE LOWER(name) = 'submitted' LIMIT 1)
     )`,
    [
      serviceRequestId,
      requestData.requester_id,
      requestData.title
        ? `Submitted: ${requestData.title}`
        : "Request submitted",
    ],
  );

  return {
    service_request_id: rows[0].service_request_id,
    start_date: rows[0].start_date,
    end_date: rows[0].end_date,
    status: "Pending",
  };
};

const findRequestById = async (requestId) => {
  const query = `
    SELECT 
      sr.*,
      u.name AS requester_name,
      u.email AS requester_email
    FROM service_request sr
    LEFT JOIN "user" u ON sr.requester_id = u.user_id
    WHERE sr.service_request_id = $1;
  `;
  const { rows } = await pool.query(query, [requestId]);
  const request = rows[0];

  if (!request) return null;
  request.created_at = request.start_date;

  const actionsQuery = `
    SELECT 
      a.action_id,
      a.date,
      a.comment,
      ast.name AS status,
      atp.name AS action_type,
      a.performed_by AS staff_id,         
      u.name AS staff_name,               
      a.staff_id AS assigned_staff_id,    
      staff.name AS assigned_staff_name   
    FROM action a
    LEFT JOIN action_status ast ON a.status_id = ast.status_id
    LEFT JOIN action_type atp ON a.action_type_id = atp.action_type_id
    LEFT JOIN "user" u ON a.performed_by = u.user_id
    LEFT JOIN "user" staff ON a.staff_id = staff.user_id
    WHERE a.service_request_id = $1
    ORDER BY a.date ASC, a.action_id ASC;
  `;
  const actionsResult = await pool.query(actionsQuery, [requestId]);

  const statusMap = {
    pending: "Pending",
    accepted: "Accepted",
    assigned: "Assigned",
    in_progress: "In Progress",
    completed: "Completed",
    closed: "Closed",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };

  const actionTypeMap = {
    submitted: "Submitted",
    status_change: "Status change",
    comment: "Comment added",
    assigned: "Assigned",
    category_update: "Category corrected",
  };

  let runningStatus = "Pending";
  request.actions = actionsResult.rows.map((action) => {
    const rawStatus = (action.status || "").toLowerCase().replace(/\s+/g, "_");
    const rawType = (action.action_type || "")
      .toLowerCase()
      .replace(/\s+/g, "_");

    const mappedStatus = statusMap[rawStatus] || action.status;
    let mappedType = actionTypeMap[rawType] || action.action_type;

    // Check if the status actually changed to force a UI update
    const isStateChange =
      (mappedStatus && mappedStatus !== runningStatus) ||
      mappedType === "Status change" ||
      mappedType === "Assigned" ||
      mappedType === "Category corrected";

    if (isStateChange && mappedType === "Comment added") {
      mappedType = "Status change";
    }

    const actionDto = {
      ...action,
      status: mappedStatus,
      action_type: mappedType,
      new_status: isStateChange ? mappedStatus : null,
      previous_status: isStateChange ? runningStatus : null,
    };

    if (mappedStatus && isStateChange) {
      runningStatus = mappedStatus;
    }

    return actionDto;
  });

  if (request.actions.length > 0) {
    const latestAction = request.actions[request.actions.length - 1];
    request.status = latestAction.status;
    request.staff_id = latestAction.assigned_staff_id;
    request.staff_name = latestAction.assigned_staff_name;
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
  // Fully lowercase, case-insensitive mapping
  const dbStatusMap = {
    pending: "pending",
    accepted: "accepted",
    assigned: "assigned",
    "in progress": "in_progress",
    in_progress: "in_progress",
    completed: "completed",
    closed: "closed",
    rejected: "rejected",
    cancelled: "cancelled",
  };

  const dbActionMap = {
    "status change": "status_change",
    status_change: "status_change",
    "comment added": "comment",
    comment_added: "comment",
    comment: "comment",
    submitted: "submitted",
    assigned: "assigned",
    "category corrected": "category_update",
    category_update: "category_update",
  };

  // Convert the frontend input to lowercase before checking the dictionary
  const rawNewStatus = String(newStatus).toLowerCase().trim();
  const rawActionType = String(actionType).toLowerCase().trim();

  const safeStatus = dbStatusMap[rawNewStatus] || "pending";
  const safeAction = dbActionMap[rawActionType] || "comment";

  // Use LOWER(name) to guarantee a match against the PostgreSQL column
  const insertActionQuery = `
    INSERT INTO action (service_request_id, performed_by, staff_id, date, comment, status_id, action_type_id)
    VALUES (
      $1, 
      $2, 
      (SELECT staff_id FROM action WHERE service_request_id = $1 AND staff_id IS NOT NULL ORDER BY date DESC, action_id DESC LIMIT 1),
      NOW(), 
      $3, 
      (SELECT status_id FROM action_status WHERE LOWER(name) = $4 LIMIT 1), 
      (SELECT action_type_id FROM action_type WHERE LOWER(name) = $5 LIMIT 1)
    )
    RETURNING action_id;
  `;

  await pool.query(insertActionQuery, [
    requestId,
    performedBy,
    comment,
    safeStatus,
    safeAction,
  ]);
  return true;
};

const deleteRequestIfPending = async (requestId, requesterId) => {
  const query = `
    DELETE FROM service_request sr
    WHERE sr.service_request_id = $1 AND sr.requester_id = $2 
      AND (
        NOT EXISTS (SELECT 1 FROM action a WHERE a.service_request_id = sr.service_request_id)
        OR EXISTS (
          SELECT 1 FROM action a JOIN action_status ast ON a.status_id = ast.status_id
          WHERE a.service_request_id = sr.service_request_id AND LOWER(ast.name) = 'pending'
            AND a.date = (SELECT MAX(a2.date) FROM action a2 WHERE a2.service_request_id = sr.service_request_id)
        )
      )
    RETURNING sr.service_request_id;
  `;
  const { rows } = await pool.query(query, [requestId, requesterId]);
  return rows[0];
};

module.exports = {
  findRequestsByRequester,
  createRequest,
  findRequestById,
  addTimelineAction,
  deleteRequestIfPending,
};
