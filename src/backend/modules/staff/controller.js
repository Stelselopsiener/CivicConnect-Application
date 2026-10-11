const staffService = require("./service");

const handleGetStaffRequests = async (req, res) => {
  try {
    const { category, status, search, sort } = req.query;
    const staffId = req.user.user_id || req.user.id || req.user._id;

    const requests = await staffService.getWorklist(staffId, {
      category,
      status,
      search,
      sort,
    });

    return res.status(200).json(requests);
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: error.message || "Failed to fetch staff worklist",
      },
    });
  }
};

const handleGetStaffMembers = async (req, res) => {
  try {
    const { category_id } = req.query;
    const members = await staffService.getAvailableStaff(category_id);
    return res.status(200).json(members);
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: error.message || "Failed to fetch staff members",
      },
    });
  }
};

const handleAssignRequest = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { staff_id } = req.body;
    const performedBy = req.user.user_id || req.user.id || req.user._id;

    if (!staff_id) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "staff_id is required for assignment",
        },
      });
    }

    const updated = await staffService.assignRequest(
      requestId,
      staff_id,
      performedBy,
    );
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: error.message || "Failed to assign service request",
      },
    });
  }
};

const handleUpdateCategory = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { category_id } = req.body;
    const performedBy = req.user.user_id || req.user.id || req.user._id;

    if (!category_id) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "category_id is required for category correction",
        },
      });
    }

    const updated = await staffService.correctCategory(
      requestId,
      category_id,
      performedBy,
    );
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: error.message || "Failed to correct request category",
      },
    });
  }
};

module.exports = {
  handleGetStaffRequests,
  handleGetStaffMembers,
  handleAssignRequest,
  handleUpdateCategory,
};
