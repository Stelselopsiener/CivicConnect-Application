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
} from './adapters/requestAdapter'
import { toUser } from './adapters/userAdapter'
import { isOpen } from '../domain/requestLifecycle'

export const ACTION_TYPE = Object.freeze({
  SUBMITTED: 'Submitted',
  STATUS_CHANGE: 'Status change',
  COMMENT: 'Comment added',
  ASSIGNED: 'Assigned',
  CATEGORY: 'Category corrected',
})

const unwrap = (body) => body?.request ?? body

/** Drops empty filters so the query string only carries what the user chose. */
const compact = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null))

/**
 * "Open" and "Overdue" are derived views, not stored statuses (D10), so they are never sent as
 * `?status=`. The gateway asks for the unfiltered list and narrows it with the domain rules.
 */
export const DERIVED_VIEW = Object.freeze({ OPEN: 'open', OVERDUE: 'overdue' })

const DERIVED_FILTERS = {
  [DERIVED_VIEW.OPEN]: (request) => isOpen(request.status),
  [DERIVED_VIEW.OVERDUE]: (request) => request.isOverdue,
}

async function listWithView(transport, url, { status, ...filters }) {
  const derived = DERIVED_FILTERS[status]
  const body = await transport.get(url, compact(derived ? filters : { status, ...filters }))
  const requests = toRequestList(body)
  return derived ? requests.filter(derived) : requests
}

export function createRequestGateway(transport) {
  return {
    async submit(form) {
      return toRequest(unwrap(await transport.post('/requests', toSubmitBody(form))))
    },

    async listMine() {
      return toRequestList(await transport.get('/requests/my'))
    },

    async getById(id) {
      return toRequest(unwrap(await transport.get(`/requests/${id}`)))
    },

    async listForStaff({ status, search, sort } = {}) {
      return listWithView(transport, '/staff/requests', { status, search, sort })
    },

    async listStaffMembers(category) {
      const body = await transport.get('/staff/members', compact({ category }))
      const rows = Array.isArray(body) ? body : (body?.members ?? body?.staff ?? [])
      return rows.map(toUser).filter(Boolean)
    },

    async assign(id, staffId) {
      return toRequest(unwrap(await transport.patch(`/requests/${id}/assign`, { staff_id: Number(staffId) || staffId })))
    },

    async changeCategory(id, category) {
      return toRequest(unwrap(await transport.patch(`/requests/${id}/category`, { category })))
    },

    async changeStatus(id, { newStatus, comment = '' }) {
      const body = { new_status: newStatus, comment: comment.trim(), action_type: ACTION_TYPE.STATUS_CHANGE }
      return toRequest(unwrap(await transport.patch(`/requests/${id}/status`, body)))
    },

    /** A comment is an action row whose status does not change (D10: "updated" is not a state). */
    async addComment(id, { currentStatus, comment }) {
      const body = { new_status: currentStatus, comment: comment.trim(), action_type: ACTION_TYPE.COMMENT }
      return toRequest(unwrap(await transport.patch(`/requests/${id}/status`, body)))
    },

    async getOverview({ startDate, endDate, category, status } = {}) {
      const params = compact({ start_date: startDate, end_date: endDate, category, status })
      return toOverview(await transport.get('/admin/overview', params))
    },

    async listAudit({ search, actionType, startDate, endDate } = {}) {
      const params = compact({ search, action_type: actionType, start_date: startDate, end_date: endDate })
      return toAuditEntries(await transport.get('/admin/audit', params))
    },

    async listAll({ status, category, search } = {}) {
      return listWithView(transport, '/admin/requests', { status, category, search })
    },
  }
}
