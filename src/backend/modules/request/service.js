const requestRepo = require("./repository");

const CATEGORY_MAP = {
  "Facility fault": 1,
  "Equipment damage": 2,
  "Security concern": 3,
  "IT support": 4,
  Maintenance: 5,
  "Lost property": 6,
  Other: 7,
};

const REVERSE_CATEGORY_MAP = {
  1: "Facility fault",
  2: "Equipment damage",
  3: "Security concern",
  4: "IT support",
  5: "Maintenance",
  6: "Lost property",
  7: "Other",
};

const formatForFrontend = (request) => {
  if (!request) return null;
  return {
    ...request,
    category: REVERSE_CATEGORY_MAP[request.category_id] || "Other",
  };
};

const getMyRequests = async (requesterId) => {
  const requests = await requestRepo.findRequestsByRequester(requesterId);
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
  return await requestRepo.createRequest(requestData);
};

const getRequestById = async (requestId) => {
  const request = await requestRepo.findRequestById(requestId);
  return formatForFrontend(request);
};

const updateRequestStatus = async (requestId, userId, updateData) => {
  let new_status =
    updateData.new_status || updateData.status || updateData.newStatus;
  let action_type =
    updateData.action_type || updateData.actionType || "Status change";
  const comment = updateData.comment || updateData.message || null;

  const currentReq = await requestRepo.findRequestById(requestId);
  if (!currentReq) throw new Error("Request not found");

  const currentStatus = currentReq.status || "Pending";

  if (!new_status) {
    new_status = currentStatus;
  }

  // ULTRA-STRICT STATE MACHINE LOCK
  // We removed the identical-state bypass. Every single update is evaluated.
  const cKey = currentStatus.toLowerCase().trim();
  const nKey = new_status.toLowerCase().trim();

  const validTransitions = {
    pending: ["accepted", "rejected", "cancelled"],
    accepted: ["in progress"],
    "in progress": ["completed", "pending"],
    completed: ["closed", "in progress"], // "in progress" allows reopening
    closed: [],
    rejected: [],
    cancelled: [],
  };

  const allowed = validTransitions[cKey] || [];

  // If the transition isn't explicitly mapped, throw the 409 Conflict error.
  if (!allowed.includes(nKey)) {
    const error = new Error(
      `Invalid transition from ${currentStatus} to ${new_status}`,
    );
    error.status = 409;
    throw error;
  }

  await requestRepo.addTimelineAction({
    requestId,
    performedBy: userId,
    newStatus: new_status,
    comment: comment,
    actionType: action_type,
  });

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
  cancelAndDeleteRequest,
};
