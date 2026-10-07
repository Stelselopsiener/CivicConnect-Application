/**
 * Derived request facts (D10): reference number, target date, overdue.
 * None of these are stored; they are calculated when a request is read.
 */
import { targetDaysFor } from './categories'
import { isOpen } from './requestLifecycle'

const DAY_MS = 24 * 60 * 60 * 1000

/** 142 -> "CC-00142". The reference users quote on the phone and in email. */
export function formatReference(id) {
  const digits = String(id ?? '').replace(/\D/g, '')
  return digits ? `CC-${digits.padStart(5, '0')}` : `CC-${id}`
}

/** "CC-00142", "cc142" or "142" -> "142". Used by search boxes. */
export function parseReference(text) {
  const match = String(text ?? '').trim().match(/^(?:cc-?)?0*(\d+)$/i)
  return match ? match[1] : null
}

export function targetDateFor(createdAt, category) {
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return null
  return new Date(created.getTime() + targetDaysFor(category) * DAY_MS)
}

/** Overdue = still open AND past the target date. A completed request is never overdue. */
export function isOverdue({ status, targetDate }, now = new Date()) {
  if (!targetDate || !isOpen(status)) return false
  return startOfDay(now) > startOfDay(targetDate)
}

export function daysOverdue(request, now = new Date()) {
  if (!isOverdue(request, now)) return 0
  return Math.round((startOfDay(now) - startOfDay(request.targetDate)) / DAY_MS)
}

export function daysBetween(from, to) {
  return (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS
}

export function median(numbers) {
  if (numbers.length === 0) return null
  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function startOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}
