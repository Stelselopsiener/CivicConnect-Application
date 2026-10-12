const adminService = require("./service");

const handleGetOversight = async (req, res) => {
  try {
    const start_date = req.query.start_date || req.query.startDate;
    const end_date = req.query.end_date || req.query.endDate;
    const { category, status } = req.query;

    const result = await adminService.getOverview({
      start_date,
      end_date,
      category,
      status,
    });
    // toOverview(body?.data ?? body) accepts either shape
    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: err.message } });
  }
};

const handleGetAllRequests = async (req, res) => {
  try {
    const {
      status,
      category,
      category_id,
      search,
      start_date,
      end_date,
      limit,
      offset,
    } = req.query;
    const result = await adminService.getAllRequests({
      status,
      category,
      category_id: category_id ? Number(category_id) : undefined,
      search,
      start_date,
      end_date,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: err.message } });
  }
};

const handleGetAuditTrail = async (req, res) => {
  try {
    const {
      request_id,
      search,
      action_type,
      start_date,
      startDate,
      limit,
      offset,
    } = req.query;
    const result = await adminService.getAuditTrail({
      request_id,
      search,
      action_type,
      start_date: start_date || startDate,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: err.message } });
  }
};

const handleGetUsers = async (req, res) => {
  try {
    const { user_type, limit, offset } = req.query;
    const result = await adminService.getUsers({
      user_type,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: err.message } });
  }
};

const handleSetUserType = async (req, res) => {
  try {
    const { userId } = req.params;
    const { user_type } = req.body;

    if (!user_type) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "user_type is required." },
      });
    }

    const result = await adminService.setUserType(userId, user_type);
    res.status(200).json({
      message: "User type updated successfully.",
      data: result,
    });
  } catch (err) {
    const status = err.message.includes("not found") ? 404 : 400;
    res.status(status).json({
      error: {
        code: status === 404 ? "NOT_FOUND" : "BAD_REQUEST",
        message: err.message,
      },
    });
  }
};

module.exports = {
  handleGetOversight,
  handleGetAllRequests,
  handleGetAuditTrail,
  handleGetUsers,
  handleSetUserType,
};
