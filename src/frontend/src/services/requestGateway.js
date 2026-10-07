/**
 * Request gateway — DESIGN PATTERN: Gateway / Repository.
 *
 * Screens ask for requests in domain terms ("my requests", "change status") and never see a
 * URL, an HTTP verb or a snake_case field. Endpoints are those of PED §12.2:
 *
 *   POST  /requests                      submit                          (requester)
 *   GET   /requests/my                   own requests + timelines        (requester)
 *   GET   /requests/:id                  one request + timeline          (role-scoped)  *
 *   GET   /staff/requests                category-scoped worklist        (staff)
 *   GET   /staff/members                 staff who can own a request     (staff)
 *   PATCH /requests/:id/assign           { staff_id }                    (staff)
 *   PATCH /requests/:id/category         { category }                    (staff)
 *   PATCH /requests/:id/status           { new_status, comment, action_type }
 *   GET   /admin/overview                counts for oversight            (management)
 *   GET   /admin/audit                   action rows                     (management)
 *   GET   /admin/requests                read-only list of all requests  (management)   *
 *
 *   * not listed in §12.2 but required by REQ-009 and the wireframed "All requests" screen;
 *     recorded as a contract gap in the frontend README.
 *
 * Written once against a `transport` (Strategy), so HTTP and demo data share this exact code.
 */
import {
  toAuditEntries,
  toOverview,
  toRequest,
  toRequestList,
  toSubmitBody,
} from "./adapters/requestAdapter";
import { toUser } from "./adapters/userAdapter";
import { isOpen } from "../domain/requestLifecycle";

export const ACTION_TYPE = Object.freeze({
  SUBMITTED: "Submitted",
  STATUS_CHANGE: "Status change",
  COMMENT: "Comment added",
  ASSIGNED: "Assigned",
  CATEGORY: "Category corrected",
});

// Updated to safely extract PED-compliant 'data' envelope if present
const unwrap = (body) =>
  body?.data?.request ?? body?.data ?? body?.request ?? body;

const compact = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value != null),
  );

export const DERIVED_VIEW = Object.freeze({ OPEN: "open", OVERDUE: "overdue" });

const DERIVED_FILTERS = {
  [DERIVED_VIEW.OPEN]: (request) => isOpen(request.status),
  [DERIVED_VIEW.OVERDUE]: (request) => request.isOverdue,
};

async function listWithView(transport, url, { status, ...filters }) {
  const derived = DERIVED_FILTERS[status];
  const body = await transport.get(
    url,
    compact(derived ? filters : { status, ...filters }),
  );
  // Safely unpack the data envelope for array responses
  const payload = body?.data ?? body;
  const requests = toRequestList(payload);
  return derived ? requests.filter(derived) : requests;
}

export function createRequestGateway(transport) {
  return {
    async submit(form) {
      return toRequest(
        unwrap(await transport.post("/requests", toSubmitBody(form))),
      );
    },

    async listMine() {
      const body = await transport.get("/requests/my");
      return toRequestList(body?.data ?? body); // Safely unpack the envelope
    },

    async getById(id) {
      return toRequest(unwrap(await transport.get(`/requests/${id}`)));
    },

    async listForStaff({ status, search, sort } = {}) {
      return listWithView(transport, "/staff/requests", {
        status,
        search,
        sort,
      });
    },

    async listStaffMembers(category) {
      const body = await transport.get("/staff/members", compact({ category }));
      const payload = body?.data ?? body;
      const rows = Array.isArray(payload)
        ? payload
        : (payload?.members ?? payload?.staff ?? []);
      return rows.map(toUser).filter(Boolean);
    },

    async assign(id, staffId) {
      return toRequest(
        unwrap(
          await transport.patch(`/requests/${id}/assign`, {
            staff_id: Number(staffId) || staffId,
          }),
        ),
      );
    },

    async changeCategory(id, category) {
      return toRequest(
        unwrap(await transport.patch(`/requests/${id}/category`, { category })),
      );
    },

    async changeStatus(id, { newStatus, comment = "" }) {
      const body = {
        new_status: newStatus,
        comment: comment.trim(),
        action_type: ACTION_TYPE.STATUS_CHANGE,
      };
      return toRequest(
        unwrap(await transport.patch(`/requests/${id}/status`, body)),
      );
    },

    async addComment(id, { currentStatus, comment }) {
      const body = {
        new_status: currentStatus,
        comment: comment.trim(),
        action_type: ACTION_TYPE.COMMENT,
      };
      return toRequest(
        unwrap(await transport.patch(`/requests/${id}/status`, body)),
      );
    },

    async getOverview({ startDate, endDate, category, status } = {}) {
      const params = compact({
        start_date: startDate,
        end_date: endDate,
        category,
        status,
      });
      const body = await transport.get("/admin/overview", params);
      return toOverview(body?.data ?? body);
    },

    async listAudit({ search, actionType, startDate, endDate } = {}) {
      const params = compact({
        search,
        action_type: actionType,
        start_date: startDate,
        end_date: endDate,
      });
      const body = await transport.get("/admin/audit", params);
      return toAuditEntries(body?.data ?? body);
    },

    async listAll({ status, category, search } = {}) {
      return listWithView(transport, "/admin/requests", {
        status,
        category,
        search,
      });
    },
  };
}
