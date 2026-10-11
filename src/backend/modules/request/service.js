const requestRepo = require("./repository");

const CATEGORY_MAP = {
  "Facility Fault": 1,
  "Equipment damage": 2,
  "Security Concern": 3,
  "IT support": 4,
  "Maintenance": 5,
  // BENNO
  // Added quotations for maintenace
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

  // BENNO
  // 4# Change - Removed hardcoded endate = null

  const result = await requestRepo.createRequest(requestData);
  return result;
};

const getRequestById = async (requestId) => {
  const request = await requestRepo.findRequestById(requestId);
  // Format the single detail view
  return formatForFrontend(request);
};

const updateRequestStatus = async (requestId, userId, updateData) => {
  const { new_status, comment, action_type } = updateData;

  if (!new_status || !action_type) {
    throw new Error("New status and action type are required.");
  }

  // 1. Insert the new action into the database timeline
  await requestRepo.addTimelineAction({
    requestId,
    performedBy: userId,
    newStatus: new_status,
    comment: comment || null,
    actionType: action_type,
  });

  // 2. Fetch the fully updated request (which will automatically derive the new status)
  // so the frontend can immediately display the changes.
  return await getRequestById(requestId);
};

const cancelAndDeleteRequest = async (requestId, requesterId) => {
  const deleted = await requestRepo.deleteRequestIfPending(
    requestId,
    requesterId,
  );

  if (!deleted) {
    throw new Error(
      "Cannot cancel: Request not found or staff have already accepted this request.",
    );
  }

  return { success: true, message: "Request successfully deleted." };
};

module.exports = {
  getMyRequests,
  submitRequest,
  getRequestById,
  updateRequestStatus,
  cancelAndDeleteRequest
};
