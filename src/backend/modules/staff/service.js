const staffRepo = require("./repository");

const CATEGORY_MAP = {
  "Facility Fault": 1,
  "Equipment damage": 2,
  "Security Concern": 3,
  "IT support": 4,
  Maintenance: 5,
  "Lost Property": 6,
  Other: 7,
};

const REVERSE_CATEGORY_MAP = {
  1: "Facility Fault",
  2: "Equipment damage",
  3: "Security Concern",
  4: "IT support",
  5: "Maintenance",
  6: "Lost Property",
  7: "Other",
};

const formatForFrontend = (request) => {
  if (!request) return null;
  return {
    ...request,
    category: REVERSE_CATEGORY_MAP[request.category_id] || "Other",
  };
};

const getWorklist = async (staffId, filters) => {
  // Pass the filters object directly into the database query
  const requests = await staffRepo.findWorklist(staffId, filters);
  return requests.map(formatForFrontend);
};

const getStaffMembers = async (categoryName) => {
  const categoryId = CATEGORY_MAP[categoryName] || 7;
  return await staffRepo.findStaffByCategory(categoryId);
};

const assignRequest = async (requestId, staffId, performedBy) => {
  if (!staffId) throw new Error("Staff ID is required.");
  return await staffRepo.assignRequest(requestId, staffId, performedBy);
};

const updateCategory = async (requestId, categoryName, performedBy) => {
  const categoryId = CATEGORY_MAP[categoryName];
  if (!categoryId) throw new Error("Invalid category.");
  return await staffRepo.updateCategory(requestId, categoryId, performedBy);
};

module.exports = {
  getWorklist,
  getStaffMembers,
  assignRequest,
  updateCategory,
};
