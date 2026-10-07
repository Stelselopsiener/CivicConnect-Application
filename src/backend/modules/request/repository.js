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

// New function to query a single request by its ID
const findRequestById = async (requestId) => {
  const query = `
    SELECT *
    FROM service_request
    WHERE service_request_id = $1;
  `;
  const { rows } = await pool.query(query, [requestId]);
  return rows[0];
};

module.exports = { findRequestsByRequester, createRequest, findRequestById };
