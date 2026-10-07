const requestRepo = require("./repository");

const CATEGORY_MAP = {
  "Facility Fault": 1,
  "Equipment damage": 2,
  "Security Concern": 3,
  "IT support": 4,
  Maintenance: 5,
  "Lost Property": 6,
  Other: 7,
};

// We need a reverse map to translate IDs back into text for the frontend
const REVERSE_CATEGORY_MAP = {
  1: "Facility Fault",
  2: "Equipment damage",
  3: "Security Concern",
  4: "IT support",
  5: "Maintenance",
  6: "Lost Property",
  7: "Other",
};

// Helper function to attach the readable category string to database rows
const formatForFrontend = (request) => {
  if (!request) return null;
  return {
    ...request,
    category: REVERSE_CATEGORY_MAP[request.category_id] || "Other",
  };
};

const getMyRequests = async (requesterId) => {
  const requests = await requestRepo.findRequestsByRequester(requesterId);
  // Format every request in the list
  return requests.map(formatForFrontend);
};

const submitRequest = async (requestData) => {
  if (
    !requestData.title ||
    !requestData.description ||
    !requestData.street_address ||
    !requestData.category
  ) {
    throw new Error("Missing mandatory fields");
  }

  requestData.category_id = CATEGORY_MAP[requestData.category] || 1;

  // BUSINESS LOGIC: A brand new request cannot have an end date.
  // This forcibly overrides whatever the frontend form sent.
  requestData.end_date = null;

  const result = await requestRepo.createRequest(requestData);
  return result;
};

const getRequestById = async (requestId) => {
  const request = await requestRepo.findRequestById(requestId);
  // Format the single detail view
  return formatForFrontend(request);
};

module.exports = { getMyRequests, submitRequest, getRequestById };
