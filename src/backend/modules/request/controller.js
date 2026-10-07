const requestService = require("./service");

const handleGetMyRequests = async (req, res) => {
  try {
    // Safely extract the ID whether your JWT calls it user_id, id, or _id
    const userId = req.user.user_id || req.user.id || req.user._id;
    const result = await requestService.getMyRequests(userId);
    res.status(200).json(result);
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

    // Logs the exact final payload to your Express terminal
    console.log("Submitting Request Data:", requestData);

    const result = await requestService.submitRequest(requestData);
    res.status(201).json(result);
  } catch (err) {
    res
      .status(400)
      .json({ error: { code: "BAD_REQUEST", message: err.message } });
  }
};

// New controller function to handle the detail fetch
const handleGetRequestById = async (req, res) => {
  try {
    const requestId = req.params.id;
    const result = await requestService.getRequestById(requestId);

    if (!result) {
      return res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Request not found" } });
    }

    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: err.message } });
  }
};

module.exports = {
  handleGetMyRequests,
  handleCreateRequest,
  handleGetRequestById,
};
