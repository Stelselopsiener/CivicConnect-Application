/** Date and text formatting shared by every screen, so the same moment always reads the same. */
const LOCALE = 'en-ZA'

const DATE = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
const SHORT_DATE = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
const TIME = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false })

const valid = (value) => value instanceof Date && !Number.isNaN(value.getTime())

export const formatDate = (date) => (valid(date) ? DATE.format(date) : 'Not set')

export const formatDateTime = (date) => (valid(date) ? `${SHORT_DATE.format(date)}, ${TIME.format(date)}` : 'Not set')

/** "Today 09:14", "Yesterday 16:02", then "22 Sep". Used in lists for "last update". */
export function formatRecent(date, now = new Date()) {
  if (!valid(date)) return 'Not set'
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)
  if (dayDiff === 0) return `Today ${TIME.format(date)}`
  if (dayDiff === 1) return `Yesterday ${TIME.format(date)}`
  return date.getFullYear() === now.getFullYear() ? SHORT_DATE.format(date) : DATE.format(date)
}

export function formatAgo(date, now = new Date()) {
  if (!valid(date)) return ''
  const minutes = Math.max(0, Math.round((now - date) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${plural(hours, 'hour')} ago`
  const days = Math.round(hours / 24)
  return `${days} ${plural(days, 'day')} ago`
}

export const plural = (count, word) => (count === 1 ? word : `${word}s`)

export const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] ?? ''

export const initials = (name) =>
  String(name ?? '').trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?'

/** Local calendar date as YYYY-MM-DD, the value format of <input type="date">. */
export const toDateInput = (date = new Date()) => date.toLocaleDateString('en-CA')

function startOfDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}
