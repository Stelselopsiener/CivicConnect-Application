/**
 * Request adapter — DESIGN PATTERN: Adapter.
 *
 * The API speaks the database's language (PED §8.2: service_request_id, street_address,
 * snake_case, ISO strings). Screens speak the UI's language (camelCase, Date objects, derived
 * `reference`, `targetDate`, `isOverdue`). This is the only place the two meet, so a renamed
 * column or a changed response shape is a one-file change.
 *
 * Both the real API and the demo API return the same DTOs, so both pass through here.
 */
import { formatReference, isOverdue, targetDateFor } from '../../domain/requestRules'
import { STATUS } from '../../domain/requestLifecycle'

const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const person = (nested, id, name, email) => {
  const personId = nested?.user_id ?? nested?.id ?? id
  if (personId === undefined || personId === null) return null
  return { id: String(personId), name: nested?.name ?? name ?? '', email: nested?.email ?? email ?? '' }
}

export function toAction(dto) {
  const previousStatus = dto.previous_status ?? null
  const newStatus = dto.new_status ?? null
  return {
    id: String(dto.action_id ?? dto.id),
    requestId: dto.service_request_id != null ? String(dto.service_request_id) : null,
    reference: dto.service_request_id != null ? formatReference(dto.service_request_id) : null,
    type: dto.action_type ?? 'Update',
    previousStatus,
    newStatus,
    statusChanged: Boolean(previousStatus && newStatus && previousStatus !== newStatus),
    detail: dto.detail ?? null,
    comment: dto.comment ?? '',
    date: toDate(dto.date ?? dto.created_at),
    actor: person(dto.staff, dto.staff_id, dto.staff_name),
  }
}

export function toRequest(dto, now = new Date()) {
  const id = dto.service_request_id ?? dto.id
  const createdAt = toDate(dto.created_at)
  const status = dto.status ?? STATUS.PENDING
  const category = dto.category ?? 'Other'
  const actions = (dto.actions ?? []).map(toAction).sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
  // The server may send target_date; otherwise derive it with the same S-IN-010 rule.
  const targetDate = toDate(dto.target_date) ?? targetDateFor(createdAt, category)
  return {
    id: String(id),
    reference: formatReference(id),
    title: dto.title ?? '',
    description: dto.description ?? '',
    streetAddress: dto.street_address ?? '',
    startDate: toDate(dto.start_date),
    endDate: toDate(dto.end_date),
    category,
    status,
    createdAt,
    targetDate,
    isOverdue: isOverdue({ status, targetDate }, now),
    lastUpdate: actions[0]?.date ?? createdAt,
    requester: person(dto.requester, dto.requester_id, dto.requester_name, dto.requester_email),
    owner: person(dto.staff, dto.staff_id, dto.staff_name),
    actions,
  }
}

/** Accepts `[...]`, `{ requests: [...] }` or `{ items: [...] }`. */
export function toRequestList(body) {
  const rows = Array.isArray(body) ? body : (body?.requests ?? body?.items ?? [])
  return rows.map((row) => toRequest(row))
}

/** UI form values -> POST /requests body (§12.2). */
export function toSubmitBody(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    street_address: form.streetAddress.trim(),
    start_date: form.startDate,
    end_date: form.endDate || null,
    category: form.category,
  }
}

export function toOverview(body) {
  const counts = body?.counts ?? body ?? {}
  return {
    counts: {
      open: Number(counts.open ?? 0),
      overdue: Number(counts.overdue ?? 0),
      resolved: Number(counts.resolved ?? counts.completed ?? 0),
      closed: Number(counts.closed ?? 0),
    },
    medianDaysToComplete: body?.median_days_to_complete ?? null,
    openByCategory: (body?.open_by_category ?? []).map((row) => ({ category: row.category, count: Number(row.count) })),
    overdueByCategory: (body?.overdue_by_category ?? []).map((row) => ({
      category: row.category,
      count: Number(row.count),
      oldestDays: Number(row.oldest_days ?? 0),
    })),
  }
}

export function toAuditEntries(body) {
  const rows = Array.isArray(body) ? body : (body?.entries ?? body?.actions ?? body?.audit ?? [])
  return rows.map(toAction)
}
