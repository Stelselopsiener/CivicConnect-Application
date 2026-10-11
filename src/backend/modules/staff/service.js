const staffRepo = require("./repository");

const REVERSE_CATEGORY_MAP = {
  1: "Equipment damage",
  2: "Infrastructure",
  3: "Sanitation",
  4: "Water & Power",
  5: "Other",
};

const formatRequestForUI = (request) => ({
  ...request,
  category: REVERSE_CATEGORY_MAP[request.category_id] || "Other",
});

const getWorklist = async (staffId, filters) => {
  const requests = await staffRepo.findWorklist(staffId, filters);
  return requests.map(formatRequestForUI);
};

const getAvailableStaff = async (categoryId) => {
  return await staffRepo.findStaffByCategory(categoryId);
};

const assignRequest = async (requestId, staffId, performedBy) => {
  return await staffRepo.assignRequest(requestId, staffId, performedBy);
};

const correctCategory = async (requestId, newCategoryId, performedBy) => {
  return await staffRepo.updateCategory(requestId, newCategoryId, performedBy);
};

module.exports = {
  getWorklist,
  getAvailableStaff,
  assignRequest,
  correctCategory,
};
