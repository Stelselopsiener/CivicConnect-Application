/**
 * Unit tests for derived request facts.
 * Basis: S-IN-010 (target date rule), REQ-022 / D10 (overdue is derived, open requests only).
 * Technique: boundary value analysis around the target date.
 */
import { describe, expect, it } from 'vitest'
import { targetDaysFor } from './categories'
import { STATUS } from './requestLifecycle'
import { daysOverdue, formatReference, isOverdue, median, parseReference, targetDateFor } from './requestRules'
import { sortRequests } from './sortStrategies'

const at = (iso) => new Date(iso)

describe('reference numbers', () => {
  it('pads the id to five digits', () => {
    expect(formatReference(142)).toBe('CC-00142')
    expect(formatReference('7')).toBe('CC-00007')
    expect(formatReference(123456)).toBe('CC-123456')
  })

  it.each([['CC-00142', '142'], ['cc142', '142'], ['142', '142'], [' CC-00007 ', '7']])('parses %s', (text, id) => {
    expect(parseReference(text)).toBe(id)
  })

  it('does not treat ordinary search text as a reference', () => {
    expect(parseReference('roof leak')).toBeNull()
    expect(parseReference('12 Church St')).toBeNull()
  })
})

describe('target date and overdue', () => {
  const created = '2026-09-01T10:00:00'
  const days = targetDaysFor('Maintenance')
  const targetDate = targetDateFor(created, 'Maintenance')

  it('adds the category target days to the submission date', () => {
    expect(targetDate.toISOString()).toBe(new Date(at(created).getTime() + days * 86400000).toISOString())
  })

  it('uses the default for an unknown category instead of failing', () => {
    expect(targetDateFor(created, 'Not a category')).toBeInstanceOf(Date)
  })

  const open = { status: STATUS.IN_PROGRESS, targetDate }
  const dayAfter = new Date(targetDate.getTime() + 86400000)

  it('is not overdue on the target date itself (boundary: last day in time)', () => {
    const endOfTargetDay = new Date(targetDate)
    endOfTargetDay.setHours(23, 59, 59)
    expect(isOverdue(open, endOfTargetDay)).toBe(false)
  })

  it('is overdue from the day after the target date (boundary: first day late)', () => {
    expect(isOverdue(open, dayAfter)).toBe(true)
    expect(daysOverdue(open, dayAfter)).toBe(1)
  })

  it.each([STATUS.COMPLETED, STATUS.CLOSED, STATUS.REJECTED, STATUS.CANCELLED])('never marks a %s request overdue', (status) => {
    expect(isOverdue({ status, targetDate }, new Date(targetDate.getTime() + 90 * 86400000))).toBe(false)
  })
})

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('sort strategies', () => {
  const requests = [
    { id: '3', title: 'b', isOverdue: false, targetDate: at('2026-10-03'), createdAt: at('2026-09-20') },
    { id: '1', title: 'c', isOverdue: true, targetDate: at('2026-10-05'), createdAt: at('2026-09-10') },
    { id: '2', title: 'a', isOverdue: true, targetDate: at('2026-10-01'), createdAt: at('2026-09-25') },
  ]
  const ids = (list) => list.map((request) => request.id)

  it('overdueFirst puts overdue work on top, soonest due first within each group', () => {
    expect(ids(sortRequests(requests, 'overdueFirst'))).toEqual(['2', '1', '3'])
  })

  it('sorts by reference numerically and can reverse', () => {
    expect(ids(sortRequests(requests, 'reference'))).toEqual(['1', '2', '3'])
    expect(ids(sortRequests(requests, 'reference', 'desc'))).toEqual(['3', '2', '1'])
  })

  it('falls back to newest for an unknown key and does not mutate the input', () => {
    expect(ids(sortRequests(requests, 'nope'))).toEqual(['2', '3', '1'])
    expect(ids(requests)).toEqual(['3', '1', '2'])
  })
})
