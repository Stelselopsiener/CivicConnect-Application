const adminRepo = require("./repository");

const VALID_USER_TYPES = ["requester", "staff", "management"];

const STATUS_TO_UI = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const ACTION_TYPE_UI_TO_DB = {
  "Submitted": "submitted",        
  "Status change": "status_change",
  "Comment added": "comment",        
  "Assigned": "assigned",
  "Category corrected": "category_update",
};

const ACTION_TYPE_DB_TO_UI = {
  submitted: "Submitted",
  status_change: "Status change",
  comment: "Comment added",
  assigned: "Assigned",
  category_update: "Category corrected",
};

const normalizeCategory = (name) => {
  const map = {
    "facility fault": "Facility fault",
    "equipment damage": "Equipment damage",
    "security concern": "Security concern",
    "it support": "IT support",
    maintenance: "Maintenance",
    "lost property": "Lost property",
    other: "Other",
  };
  return map[String(name ?? "").trim().toLowerCase()] ?? name;
};

const formatRequest = (row) => {
  if (!row) return null;
  return {
    ...row,
    status: STATUS_TO_UI[row.status] ?? row.status ?? "Pending",
    category: normalizeCategory(row.category),
  };
};

/** Shape required by frontend toOverview() */
const getOverview = async (filters = {}) => {
  const rows = await adminRepo.getOverviewRows({
    start_date: filters.start_date,
    end_date: filters.end_date,
    category: filters.category,
  });

  const openRows = rows.filter((r) => r.is_open);
  const overdueRows = rows.filter((r) => r.is_overdue);
  const resolvedRows = rows.filter((r) => r.status_name === "completed");
  const closedRows = rows.filter((r) => r.status_name === "closed");

  const completionDays = rows
    .map((r) => (r.days_to_complete != null ? Number(r.days_to_complete) : null))
    .filter((d) => d != null)
    .sort((a, b) => a - b);

  let medianDays = null;
  if (completionDays.length) {
    const mid = Math.floor(completionDays.length / 2);
    medianDays =
      completionDays.length % 2 === 0
        ? (completionDays[mid - 1] + completionDays[mid]) / 2
        : completionDays[mid];
    medianDays = Math.round(medianDays * 10) / 10;
  }

  const byCategory = (list, withOldest = false) => {
    const map = new Map();
    for (const row of list) {
      const key = normalizeCategory(row.category);
      const cur = map.get(key) ?? { category: key, count: 0, oldest_days: 0 };
      cur.count += 1;
      if (withOldest) {
        cur.oldest_days = Math.max(cur.oldest_days, Number(row.days_overdue) || 0);
      }
      map.set(key, cur);
    }
    return [...map.values()];
  };

  return {
    counts: {
      open: openRows.length,
      overdue: overdueRows.length,
      resolved: resolvedRows.length,
      closed: closedRows.length,
    },
    median_days_to_complete: medianDays,
    open_by_category: byCategory(openRows).map(({ category, count }) => ({
      category,
      count,
    })),
    overdue_by_category: byCategory(overdueRows, true).map(
      ({ category, count, oldest_days }) => ({
        category,
        count,
        oldest_days,
      }),
    ),
  };
};

const getAllRequests = async (filters = {}) => {
  const requests = await adminRepo.findAllRequests({
    status: filters.status,
    category: filters.category,
    category_id: filters.category_id,
    search: filters.search,
    start_date: filters.start_date,
    end_date: filters.end_date,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  });
  return requests.map(formatRequest);
};

const getAuditTrail = async (filters = {}) => {
  const mappedActionType = filters.action_type
    ? ACTION_TYPE_UI_TO_DB[filters.action_type] ||
      filters.action_type.toLowerCase().replace(/\s+/g, "_")
    : undefined;

  const rows = await adminRepo.findAuditTrail({
    request_id: filters.request_id,
    search: filters.search,
    action_type: mappedActionType,
    start_date: filters.start_date || filters.startDate,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  });

return rows.map((r) => ({
    ...r,
    status: STATUS_TO_UI[r.status] ?? r.status,
    previous_status: STATUS_TO_UI[r.previous_status] ?? r.previous_status,
    new_status: STATUS_TO_UI[r.new_status] ?? r.new_status,
    staff_name: r.staff_name ?? r.actor_name,
  }));
};

const getUsers = async (filters = {}) => {
  return adminRepo.findAllUsers({
    user_type: filters.user_type,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  });
};

const setUserType = async (userId, userType) => {
  if (!VALID_USER_TYPES.includes(userType)) {
    throw new Error(
      `Invalid user_type. Must be one of: ${VALID_USER_TYPES.join(", ")}.`,
    );
  }
  const updated = await adminRepo.updateUserType(userId, userType);
  if (!updated) throw new Error("User not found.");
  return updated;
};

module.exports = {
  getOverview,
  getAllRequests,
  getAuditTrail,
  getUsers,
  setUserType,
};