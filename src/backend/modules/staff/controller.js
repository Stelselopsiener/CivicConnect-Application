const staffService = require("./service");

const handleGetWorklist = async (req, res) => {
  try {
    const staffId = req.user.user_id || req.user.id || req.user._id;
    // Extract the filters sent by the React frontend
    const { status, search } = req.query;

    const result = await staffService.getWorklist(staffId, { status, search });
    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: err.message } });
  }
};

const handleGetStaffByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    const result = await staffService.getStaffMembers(category);
    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: err.message } });
  }
};

const handleAssignRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const performedBy = req.user.user_id || req.user.id || req.user._id;
    const { staff_id } = req.body;

    const result = await staffService.assignRequest(
      requestId,
      staff_id,
      performedBy,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(400)
      .json({ error: { code: "BAD_REQUEST", message: err.message } });
  }
};

const handleUpdateCategory = async (req, res) => {
  try {
    const requestId = req.params.id;
    const performedBy = req.user.user_id || req.user.id || req.user._id;
    const { category } = req.body;

    const result = await staffService.updateCategory(
      requestId,
      category,
      performedBy,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    res
      .status(400)
      .json({ error: { code: "BAD_REQUEST", message: err.message } });
  }
};

module.exports = {
  handleGetWorklist,
  handleGetStaffByCategory,
  handleAssignRequest,
  handleUpdateCategory,
};
