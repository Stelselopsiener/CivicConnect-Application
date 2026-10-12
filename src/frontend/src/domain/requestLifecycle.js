/**
 * Request lifecycle — DESIGN PATTERN: State.
 *
 * Implements the D10 state model (PED §7.5). Each of the seven stored statuses is a
 * RequestState object that knows which moves leave it, who may make them and whether a
 * comment is required. The UI never contains an `if (status === ...)` ladder: screens ask the
 * current state what is possible and render exactly that (REQ-013, REQ-016, REQ-017).
 *
 * The API enforces the same rules and answers 409 Conflict if they are bypassed (§12.4); this
 * module exists so the user is never offered a move the server would refuse.
 *
 * Pure JavaScript: no React, no HTTP. Unit-tested in requestLifecycle.test.js.
 */

export const STATUS = Object.freeze({
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
})

export const ROLE = Object.freeze({
  REQUESTER: 'requester',
  STAFF: 'staff',
  MANAGEMENT: 'management',
})

export class LifecycleError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'LifecycleError'
    this.code = code
  }
}

class RequestState {
  /**
   * @param {string} name     stored status value
   * @param {object} options
   * @param {boolean} options.open       counts as "open" for oversight (derived, D10)
   * @param {string} options.meaning     plain-language meaning shown to requesters
   * @param {Array}  options.transitions moves that leave this state
   */
  constructor(name, { open, meaning, transitions = [] }) {
    this.name = name
    this.open = open
    this.meaning = meaning
    this.transitions = transitions
    Object.freeze(this)
  }

  get terminal() {
    return this.transitions.length === 0
  }

  transitionTo(target) {
    return this.transitions.find((transition) => transition.to === target) ?? null
  }

  transitionsFor(role) {
    return this.transitions.filter((transition) => transition.roles.includes(role))
  }

  /** Why `role` cannot move this request to `target`, or null if the move is allowed. */
  blockReason(target, role) {
    if (target === this.name) return `The request is already ${this.name}.`
    const transition = this.transitionTo(target)
    if (!transition) {
      return this.terminal
        ? `A ${this.name.toLowerCase()} request cannot change status.`
        : `Not allowed from ${this.name}.`
    }
    if (!transition.roles.includes(role)) return `Only ${transition.roles.join(' or ')} can do this.`
    return null
  }
}

const { PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CLOSED, REJECTED, CANCELLED } = STATUS
const { REQUESTER, STAFF } = ROLE

const STATES = Object.freeze({
  [PENDING]: new RequestState(PENDING, {
    open: true,
    meaning: 'We received your request. It is waiting for a staff member to pick it up.',
    transitions: [
      { to: ACCEPTED, roles: [STAFF], action: 'Accept', requiresComment: false },
      { to: REJECTED, roles: [STAFF], action: 'Reject', requiresComment: true },
      { to: CANCELLED, roles: [REQUESTER], action: 'Cancel request', requiresComment: false },
    ],
  }),
  [ACCEPTED]: new RequestState(ACCEPTED, {
    open: true,
    meaning: 'A staff member has taken responsibility for your request.',
    transitions: [{ to: IN_PROGRESS, roles: [STAFF], action: 'Start work', requiresComment: false }],
  }),
  [IN_PROGRESS]: new RequestState(IN_PROGRESS, {
    open: true,
    meaning: 'Work on your request has started.',
    transitions: [{ to: COMPLETED, roles: [STAFF], action: 'Mark completed', requiresComment: true }],
  }),
  [COMPLETED]: new RequestState(COMPLETED, {
    open: false,
    meaning: 'The work is done.',
    transitions: [
      { to: CLOSED, roles: [STAFF], action: 'Close', requiresComment: false },
      { to: IN_PROGRESS, roles: [STAFF], action: 'Reopen', requiresComment: true },
    ],
  }),
  [CLOSED]: new RequestState(CLOSED, { open: false, meaning: 'This request is closed.' }),
  [REJECTED]: new RequestState(REJECTED, {
    open: false,
    meaning: 'Staff could not take this request on. The reason is in the latest update.',
  }),
  [CANCELLED]: new RequestState(CANCELLED, { open: false, meaning: 'You cancelled this request.' }),
})

/** The normal route through the lifecycle, in order. Drives the progress rail. */
export const MAIN_PATH = Object.freeze([PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CLOSED])

export const ALL_STATUSES = Object.freeze(Object.keys(STATES))
export const OPEN_STATUSES = Object.freeze(ALL_STATUSES.filter((name) => STATES[name].open))

/** Statuses a staff member can ever select, in the order the workspace lists them. */
const STAFF_TARGETS = Object.freeze([ACCEPTED, IN_PROGRESS, COMPLETED, CLOSED, REJECTED])

export function stateOf(status) {
  const state = STATES[status]
  if (!state) throw new LifecycleError('UNKNOWN_STATUS', `"${status}" is not a CivicConnect status.`)
  return state
}

export function isOpen(status) {
  return Boolean(STATES[status]?.open)
}

export function canTransition(from, to, role) {
  return stateOf(from).blockReason(to, role) === null
}

export function availableTransitions(status, role) {
  return stateOf(status).transitionsFor(role)
}

/**
 * Every status a staff member could pick, each marked allowed or blocked with the reason.
 * Blocked moves stay visible (disabled, with the reason) so staff learn the model instead of
 * wondering where an option went — wireframe note "Only valid transitions are offered".
 */
export function staffTransitionOptions(status) {
  const state = stateOf(status)
  return STAFF_TARGETS.filter((target) => target !== status).map((target) => {
    const transition = state.transitionTo(target)
    const reason = state.blockReason(target, STAFF)
    return {
      to: target,
      allowed: reason === null,
      reason,
      action: transition?.action ?? target,
      requiresComment: Boolean(transition?.requiresComment),
    }
  })
}

/** Throws LifecycleError unless the move is valid. Used by the demo API to mirror the server. */
export function assertTransition(from, to, role, { comment = '' } = {}) {
  const state = stateOf(from)
  stateOf(to)
  const reason = state.blockReason(to, role)
  if (reason) throw new LifecycleError('INVALID_TRANSITION', `Cannot move from ${from} to ${to}. ${reason}`)
  if (state.transitionTo(to).requiresComment && !comment.trim()) {
    throw new LifecycleError('COMMENT_REQUIRED', `A comment is required to move a request to ${to}.`)
  }
  return state.transitionTo(to)
}
