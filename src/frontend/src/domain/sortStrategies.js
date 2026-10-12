/**
 * Request ordering — DESIGN PATTERN: Strategy.
 *
 * Every way of ordering a request list is a comparator registered under a key. The worklist,
 * "My requests" and "All requests" tables all call `sortRequests(list, key)`; a column header
 * only changes which strategy is selected (REQ-008). A new ordering is one new entry here.
 */
import { ALL_STATUSES } from './requestLifecycle'

const time = (value) => (value ? new Date(value).getTime() : 0)
const text = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' })

export const SORT_STRATEGIES = {
  /** Default staff order: overdue work first, then whatever is due soonest. */
  overdueFirst: {
    label: 'Overdue first',
    compare: (a, b) => Number(b.isOverdue) - Number(a.isOverdue) || time(a.targetDate) - time(b.targetDate),
  },
  dueSoonest: { label: 'Due soonest', compare: (a, b) => time(a.targetDate) - time(b.targetDate) },
  newest: { label: 'Newest first', compare: (a, b) => time(b.createdAt) - time(a.createdAt) },
  oldest: { label: 'Oldest first', compare: (a, b) => time(a.createdAt) - time(b.createdAt) },
  lastUpdate: { label: 'Last update', compare: (a, b) => time(b.lastUpdate) - time(a.lastUpdate) },
  reference: { label: 'Reference', compare: (a, b) => Number(a.id) - Number(b.id) },
  status: {
    label: 'Status',
    compare: (a, b) => ALL_STATUSES.indexOf(a.status) - ALL_STATUSES.indexOf(b.status),
  },
  title: { label: 'Title', compare: (a, b) => text(a.title, b.title) },
  category: { label: 'Category', compare: (a, b) => text(a.category, b.category) },
}

export function sortRequests(requests, key = 'newest', direction = 'asc') {
  const strategy = SORT_STRATEGIES[key] ?? SORT_STRATEGIES.newest
  const sorted = [...requests].sort(strategy.compare)
  return direction === 'desc' ? sorted.reverse() : sorted
}
