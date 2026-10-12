const requestRepo = require("./repository");

const CATEGORY_MAP = {
  "Facility fault": 1,
  "Equipment damage": 2,
  "Security concern": 3,
  "IT support": 4,
  "Maintenance": 5,
  "Lost property": 6,
  "Other": 7,
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
  const result = await requestRepo.createRequest(requestData);
  return result;
};

const getRequestById = async (requestId) => {
  const request = await requestRepo.findRequestById(requestId);
  return formatForFrontend(request);
};

const updateRequestStatus = async (requestId, userId, updateData) => {
  let new_status =
    updateData.new_status || updateData.status || updateData.newStatus;
  let action_type = updateData.action_type || updateData.actionType;
  const comment = updateData.comment || updateData.message || null;

  // BULLETPROOFING: If the frontend didn't pass a status, fetch the current one so we never throw a 400!
  if (!new_status) {
    const currentReq = await requestRepo.findRequestById(requestId);
    if (!currentReq) throw new Error("Request not found");
    new_status = currentReq.status || "Pending";
  }

  if (!action_type) {
    action_type = "Status change";
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
