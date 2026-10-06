/**
 * Unit tests for the D10 state model (State pattern).
 * Basis: PED §7.5 Table 7-4, REQ-013, REQ-016, REQ-017, S-IN-007 (CR-003).
 * Technique: state-transition testing — every valid move, plus the invalid moves that matter.
 */
import { describe, expect, it } from 'vitest'
import {
  ALL_STATUSES,
  LifecycleError,
  OPEN_STATUSES,
  ROLE,
  STATUS,
  assertTransition,
  availableTransitions,
  canTransition,
  isOpen,
  staffTransitionOptions,
} from './requestLifecycle'

const { PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CLOSED, REJECTED, CANCELLED } = STATUS
const { REQUESTER, STAFF, MANAGEMENT } = ROLE

describe('D10 state model', () => {
  it('stores exactly the seven D10 statuses', () => {
    expect(ALL_STATUSES).toEqual([PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CLOSED, REJECTED, CANCELLED])
  })

  it('derives "open" as Pending, Accepted or In Progress', () => {
    expect(OPEN_STATUSES).toEqual([PENDING, ACCEPTED, IN_PROGRESS])
    expect(isOpen(COMPLETED)).toBe(false)
    expect(isOpen('Nonsense')).toBe(false)
  })

  // The complete transition table: [from, to, role]. Anything not listed must be refused.
  const VALID = [
    [PENDING, ACCEPTED, STAFF],
    [PENDING, REJECTED, STAFF],
    [PENDING, CANCELLED, REQUESTER],
    [ACCEPTED, IN_PROGRESS, STAFF],
    [IN_PROGRESS, COMPLETED, STAFF],
    [COMPLETED, CLOSED, STAFF],
    [COMPLETED, IN_PROGRESS, STAFF], // reopen (S-IN-007)
  ]

  it.each(VALID)('allows %s -> %s by %s', (from, to, role) => {
    expect(canTransition(from, to, role)).toBe(true)
  })

  it('refuses every move that is not in the transition table', () => {
    const allowed = new Set(VALID.map((move) => move.join('|')))
    const wronglyAllowed = []
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        for (const role of [REQUESTER, STAFF, MANAGEMENT]) {
          if (!allowed.has([from, to, role].join('|')) && canTransition(from, to, role)) wronglyAllowed.push([from, to, role])
        }
      }
    }
    expect(wronglyAllowed).toEqual([])
  })

  it('lets a requester cancel only while Pending', () => {
    expect(availableTransitions(PENDING, REQUESTER).map((t) => t.to)).toEqual([CANCELLED])
    for (const status of [ACCEPTED, IN_PROGRESS, COMPLETED, CLOSED, REJECTED, CANCELLED]) {
      expect(availableTransitions(status, REQUESTER)).toEqual([])
    }
  })

  it('gives management no transitions at all (read-only role)', () => {
    for (const status of ALL_STATUSES) expect(availableTransitions(status, MANAGEMENT)).toEqual([])
  })

  it('treats Closed, Rejected and Cancelled as terminal', () => {
    for (const status of [CLOSED, REJECTED, CANCELLED]) {
      expect(staffTransitionOptions(status).every((option) => !option.allowed)).toBe(true)
    }
  })
})

describe('staffTransitionOptions (what the workspace renders)', () => {
  it('from Pending offers Accepted and Rejected, and explains why Completed is blocked', () => {
    const options = Object.fromEntries(staffTransitionOptions(PENDING).map((option) => [option.to, option]))
    expect(options[ACCEPTED].allowed).toBe(true)
    expect(options[REJECTED]).toMatchObject({ allowed: true, requiresComment: true })
    expect(options[COMPLETED]).toMatchObject({ allowed: false, reason: 'Not allowed from Pending.' })
  })

  it('never lists the current status as an option', () => {
    for (const status of ALL_STATUSES) {
      expect(staffTransitionOptions(status).map((option) => option.to)).not.toContain(status)
    }
  })
})

describe('assertTransition (rule the demo API enforces, as the server does)', () => {
  it('rejects a skipped step with INVALID_TRANSITION', () => {
    expect(() => assertTransition(PENDING, COMPLETED, STAFF, { comment: 'done' })).toThrowError(LifecycleError)
    try {
      assertTransition(PENDING, COMPLETED, STAFF)
    } catch (error) {
      expect(error.code).toBe('INVALID_TRANSITION')
    }
  })

  it('requires a reason to reject, and treats whitespace as empty', () => {
    expect(() => assertTransition(PENDING, REJECTED, STAFF, { comment: '   ' })).toThrowError(/comment is required/)
    expect(() => assertTransition(PENDING, REJECTED, STAFF, { comment: 'Duplicate of CC-00012' })).not.toThrow()
  })

  it('stops a requester from changing a status only staff may change', () => {
    expect(() => assertTransition(PENDING, ACCEPTED, REQUESTER)).toThrowError(/Only staff/)
  })

  it('rejects an unknown status value', () => {
    expect(() => assertTransition(PENDING, 'Escalated', STAFF)).toThrowError(/not a CivicConnect status/)
  })
})
