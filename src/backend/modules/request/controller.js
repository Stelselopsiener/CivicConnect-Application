const requestService = require("./service");

const handleGetMyRequests = async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id || req.user._id;
    const result = await requestService.getMyRequests(userId);
    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: err.message } });
  }
};

const handleCreateRequest = async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id || req.user._id;

    const requestData = {
      ...req.body,
      requester_id: userId,
    };

    console.log("Submitting Request Data:", requestData);

    const result = await requestService.submitRequest(requestData);
    res.status(201).json({ data: result });
  } catch (err) {
    res
      .status(400)
      .json({ error: { code: "BAD_REQUEST", message: err.message } });
  }
};

const handleGetRequestById = async (req, res) => {
  try {
    const requestId = req.params.id;
    const result = await requestService.getRequestById(requestId);

    if (!result) {
      return res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Request not found" } });
    }

    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: err.message } });
  }
};

const handleUpdateStatus = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.user_id || req.user.id || req.user._id;
    const updateData = req.body;

    const result = await requestService.updateRequestStatus(
      requestId,
      userId,
      updateData,
    );

    res.status(200).json({ data: result });
  } catch (err) {
    console.error(`[Status Update Error - Request ${req.params.id}]:`, err);
    // Allow the service to dictate a 409 status code for state machine locks
    const statusCode = err.status || 400;
    const code = statusCode === 409 ? "CONFLICT" : "BAD_REQUEST";

    res.status(statusCode).json({ error: { code, message: err.message } });
  }
};

const handleCancelRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.user_id || req.user.id || req.user._id;
    const result = await requestService.cancelAndDeleteRequest(
      requestId,
      userId,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(400)
      .json({ error: { code: "BAD_REQUEST", message: err.message } });
  }
};

module.exports = {
  handleGetMyRequests,
  handleCreateRequest,
  handleGetRequestById,
  handleUpdateStatus,
  handleCancelRequest,
};
