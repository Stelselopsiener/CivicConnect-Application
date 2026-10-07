const requestService = require("./service");

const handleGetMyRequests = async (req, res) => {
  try {
    // Now dynamically pulled from the verified JWT!
    const requesterId = req.user.user_id;
    const result = await requestService.getMyRequests(requesterId);
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: err.message } });
  }
};

const handleCreateRequest = async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      requester_id: req.user.user_id, // Dynamically pulled from JWT
    };
    const result = await requestService.submitRequest(requestData);
    res.status(201).json(result);
  } catch (err) {
    res
      .status(400)
      .json({ error: { code: "BAD_REQUEST", message: err.message } });
  }
};

module.exports = { handleGetMyRequests, handleCreateRequest };
