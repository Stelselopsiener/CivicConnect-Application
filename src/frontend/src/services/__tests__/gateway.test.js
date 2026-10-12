/**
 * Component tests for the service layer: gateway + adapter + decorator + event bus, run against
 * the demo transport. They exercise the same gateway code that runs against the real API.
 * Basis: PED §12.2 contract, §12.4 error semantics, ASR-002 (role scoping), REQ-031, D12, D13.
 *
 * These are NOT integration tests of the Express API: the transport is the in-browser demo.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The demo database persists through `storage`; give it a clean in-memory store per test.
vi.stubGlobal('window', { localStorage: (() => {
  let data = {}
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v) }, removeItem: (k) => { delete data[k] }, clear: () => { data = {} } }
})() })

const { createServices } = await import('../index')
const { createEventBus, EVENT } = await import('../events/eventBus')
const { mockTransport } = await import('../mock/mockTransport')
const { resetDb, DEMO_PASSWORD } = await import('../mock/mockDb')
const { AppError, ERROR_CODE, toAppError } = await import('../AppError')
const { toRequest } = await import('../adapters/requestAdapter')
const { STATUS } = await import('../../domain/requestLifecycle')

const REQUESTER = { email: 'thandi.m@example.org', password: DEMO_PASSWORD }
const STAFF = { email: 'pieter.vdm@civicconnect.example', password: DEMO_PASSWORD }
const MANAGER = { email: 'lindiwe.n@civicconnect.example', password: DEMO_PASSWORD }

const newRequest = {
  category: 'Maintenance', title: 'Gutter hanging loose at library', description: 'The front gutter has come off its brackets.',
  streetAddress: 'Library, 1 Park Ln', startDate: '2026-10-01', endDate: '',
}

let bus
let auth
let requests
let published

beforeEach(() => {
  window.localStorage.clear()
  resetDb()
  bus = createEventBus()
  published = []
  for (const name of Object.values(EVENT)) bus.subscribe(name, (payload) => published.push([name, payload]))
  ;({ auth, requests } = createServices({ transport: mockTransport, bus }))
})

const rejection = async (promise) => {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected the call to be rejected')
}

describe('request adapter', () => {
  it('maps the API record to the UI model and derives reference, target date and overdue', () => {
    const request = toRequest(
      { service_request_id: 7, title: 'T', street_address: '1 Main Rd', category: 'IT support', status: 'Accepted',
        created_at: '2026-01-01T08:00:00Z', staff_id: 13, staff_name: 'Lerato Khoza', actions: [] },
      new Date('2026-02-01T08:00:00Z'),
    )
    expect(request).toMatchObject({ id: '7', reference: 'CC-00007', streetAddress: '1 Main Rd', isOverdue: true })
    expect(request.owner).toEqual({ id: '13', name: 'Lerato Khoza', email: '' })
    expect(request.targetDate.toISOString()).toBe('2026-01-04T08:00:00.000Z')
  })

  it('prefers a target_date sent by the server over the local rule', () => {
    const request = toRequest({ service_request_id: 1, status: 'Pending', created_at: '2026-01-01T08:00:00Z', target_date: '2026-03-01T00:00:00Z' })
    expect(request.targetDate.toISOString()).toBe('2026-03-01T00:00:00.000Z')
  })
})

describe('error envelope (§12.4)', () => {
  it('reads code, message and details from the standard envelope', () => {
    const error = toAppError({ response: { status: 409, data: { error: { code: 'INVALID_TRANSITION', message: 'Not allowed', details: [{ field: 'x' }] } } } })
    expect(error).toMatchObject({ status: 409, code: 'INVALID_TRANSITION', message: 'Not allowed', details: [{ field: 'x' }] })
  })

  it('still produces a usable message from the current backend shape { error: "text" }', () => {
    expect(toAppError({ response: { status: 500, data: { error: 'relation "requests" does not exist' } } }).status).toBe(500)
  })

  it('reports an unreachable server as a network error', () => {
    expect(toAppError({ message: 'Network Error' }).code).toBe(ERROR_CODE.NETWORK)
  })
})

describe('sign-in and email confirmation (D13)', () => {
  it('signs in and builds the user from the JWT claims', async () => {
    const user = await auth.signIn(STAFF)
    expect(user).toMatchObject({ role: 'staff', category: 'Maintenance', name: 'Pieter van der Merwe' })
    expect(auth.currentUser()).toMatchObject({ id: user.id, role: 'staff' })
  })

  it('answers a wrong password with a generic 401', async () => {
    const error = await rejection(auth.signIn({ ...REQUESTER, password: 'wrong-password' }))
    expect(error).toMatchObject({ status: 401, code: ERROR_CODE.INVALID_CREDENTIALS, message: 'Email or password is incorrect.' })
  })

  it('blocks sign-in until the email is confirmed, and the link works exactly once', async () => {
    const account = { name: 'New Person', email: 'new.person@example.org', password: 'long-enough-1' }
    const { demo_verification_token: token } = await auth.register(account)

    expect(await rejection(auth.signIn(account))).toMatchObject({ status: 403, code: ERROR_CODE.EMAIL_NOT_VERIFIED })
    await auth.verifyEmail(token)
    expect(await rejection(auth.verifyEmail(token))).toMatchObject({ status: 400, code: ERROR_CODE.TOKEN_INVALID })
    expect(await auth.signIn(account)).toMatchObject({ role: 'requester' })
  })

  it('invalidates the old link when a new one is requested', async () => {
    const account = { name: 'New Person', email: 'new.person@example.org', password: 'long-enough-1' }
    const first = (await auth.register(account)).demo_verification_token
    const second = (await auth.resendVerification(account.email)).demo_verification_token
    expect(second).not.toBe(first)
    expect(await rejection(auth.verifyEmail(first))).toMatchObject({ code: ERROR_CODE.TOKEN_INVALID })
  })

  it('gives the same answer for an address that is already registered (no account enumeration)', async () => {
    const response = await auth.register({ name: 'Someone', email: REQUESTER.email, password: 'long-enough-1' })
    expect(response.message).toMatch(/confirmation link/)
    expect(response.demo_verification_token).toBeUndefined()
  })
})

describe('requester journey', () => {
  beforeEach(() => auth.signIn(REQUESTER))

  it('submits a request as Pending and publishes REQUEST_SUBMITTED after success', async () => {
    const request = await requests.submit(newRequest)
    expect(request).toMatchObject({ status: STATUS.PENDING, category: 'Maintenance', owner: null })
    expect(request.actions).toHaveLength(1)
    expect(published).toEqual([[EVENT.REQUEST_SUBMITTED, { request }]])
    expect((await requests.listMine()).map((r) => r.id)).toContain(request.id)
  })

  it('rejects a duplicate open request with 409 and publishes nothing (REQ-031)', async () => {
    const first = await requests.submit(newRequest)
    published.length = 0
    const error = await rejection(requests.submit({ ...newRequest, title: '  gutter HANGING loose at library ' }))
    expect(error).toMatchObject({ status: 409, code: ERROR_CODE.DUPLICATE_REQUEST })
    expect(error.details[0].message).toBe(first.id)
    expect(published).toEqual([])
  })

  it('returns only the signed-in requester\'s own requests (ASR-002)', async () => {
    const mine = await requests.listMine()
    expect(mine.length).toBeGreaterThan(0)
    expect(new Set(mine.map((r) => r.requester.email))).toEqual(new Set([REQUESTER.email]))
  })

  it('hides another requester\'s request behind 404', async () => {
    expect(await rejection(requests.getById('133'))).toMatchObject({ status: 404 })
  })

  it('is refused staff and management endpoints with 403', async () => {
    expect(await rejection(requests.listForStaff())).toMatchObject({ status: 403, code: ERROR_CODE.FORBIDDEN })
    expect(await rejection(requests.listAudit())).toMatchObject({ status: 403 })
  })

  it('can cancel while Pending but not once accepted', async () => {
    expect((await requests.changeStatus('142', { newStatus: STATUS.CANCELLED })).status).toBe(STATUS.CANCELLED)
    expect(await rejection(requests.changeStatus('117', { newStatus: STATUS.CANCELLED }))).toMatchObject({ status: 409, code: ERROR_CODE.INVALID_TRANSITION })
  })
})

describe('staff journey', () => {
  beforeEach(() => auth.signIn(STAFF))

  it('lists only the staff member\'s own category', async () => {
    const worklist = await requests.listForStaff({ status: '' })
    expect(new Set(worklist.map((r) => r.category))).toEqual(new Set(['Maintenance']))
  })

  it('filters derived views locally: "overdue" returns only open requests past their target date', async () => {
    const overdue = await requests.listForStaff({ status: 'overdue' })
    expect(overdue.map((r) => r.id).sort()).toEqual(['109', '121'])
  })

  it('finds a request by reference', async () => {
    expect((await requests.listForStaff({ status: '', search: 'cc-00128' })).map((r) => r.id)).toEqual(['128'])
  })

  it('accepting a Pending request makes the staff member its owner and writes one action row', async () => {
    const me = auth.currentUser()
    const before = await requests.getById('133')
    const after = await requests.assign('133', me.id)
    expect(after).toMatchObject({ status: STATUS.ACCEPTED, owner: { id: me.id } })
    expect(after.actions).toHaveLength(before.actions.length + 1)
    expect(after.actions[0]).toMatchObject({ type: 'Assigned', previousStatus: STATUS.PENDING, newStatus: STATUS.ACCEPTED })
    expect(published.at(-1)[0]).toBe(EVENT.REQUEST_ASSIGNED)
  })

  it('walks the full lifecycle, and every step adds exactly one audit row', async () => {
    const me = auth.currentUser()
    await requests.assign('136', me.id)
    await requests.changeStatus('136', { newStatus: STATUS.IN_PROGRESS })
    await requests.changeStatus('136', { newStatus: STATUS.COMPLETED, comment: 'Drain cleared and flushed.' })
    const closed = await requests.changeStatus('136', { newStatus: STATUS.CLOSED })
    expect(closed.status).toBe(STATUS.CLOSED)
    expect(closed.actions.map((a) => a.newStatus)).toEqual([STATUS.CLOSED, STATUS.COMPLETED, STATUS.IN_PROGRESS, STATUS.ACCEPTED, STATUS.PENDING])
  })

  it('refuses a skipped step with 409 and leaves status and history unchanged', async () => {
    const before = await requests.getById('133')
    const error = await rejection(requests.changeStatus('133', { newStatus: STATUS.COMPLETED, comment: 'done' }))
    expect(error).toMatchObject({ status: 409, code: ERROR_CODE.INVALID_TRANSITION })
    const after = await requests.getById('133')
    expect(after.status).toBe(before.status)
    expect(after.actions).toHaveLength(before.actions.length)
  })

  it('refuses to reject without a reason', async () => {
    expect(await rejection(requests.changeStatus('133', { newStatus: STATUS.REJECTED, comment: ' ' }))).toMatchObject({ status: 400 })
  })

  it('records a comment without changing the status', async () => {
    const updated = await requests.addComment('128', { currentStatus: STATUS.IN_PROGRESS, comment: 'Plumber confirmed for Thursday 08:00.' })
    expect(updated.status).toBe(STATUS.IN_PROGRESS)
    expect(updated.actions[0]).toMatchObject({ type: 'Comment added', statusChanged: false })
  })

  it('can only assign to staff in the request\'s category', async () => {
    expect((await requests.listStaffMembers('Maintenance')).map((m) => m.name).sort()).toEqual(['Pieter van der Merwe', 'Sipho Dlamini'])
    expect(await rejection(requests.assign('133', '13'))).toMatchObject({ status: 400 }) // Lerato is IT support
  })

  it('moves a corrected request out of this team\'s reach (REQ-024)', async () => {
    const moved = await requests.changeCategory('133', 'Facility fault')
    expect(moved.category).toBe('Facility fault')
    expect(moved.actions[0]).toMatchObject({ type: 'Category corrected', detail: 'Maintenance → Facility fault' })
    expect(await rejection(requests.getById('133'))).toMatchObject({ status: 404 })
  })

  it('cannot open a request from another category', async () => {
    expect(await rejection(requests.getById('117'))).toMatchObject({ status: 404 })
  })
})

describe('management oversight', () => {
  beforeEach(() => auth.signIn(MANAGER))

  it('reports counts that agree with the request list', async () => {
    const overview = await requests.getOverview()
    const all = await requests.listAll()
    expect(overview.counts.open).toBe((await requests.listAll({ status: 'open' })).length)
    expect(overview.counts.overdue).toBe(all.filter((r) => r.isOverdue).length)
    expect(overview.counts.resolved).toBe(all.filter((r) => r.status === STATUS.COMPLETED).length)
    expect(overview.counts.closed).toBe(all.filter((r) => r.status === STATUS.CLOSED).length)
    expect(overview.openByCategory.reduce((sum, row) => sum + row.count, 0)).toBe(overview.counts.open)
  })

  it('lists audit entries newest first and filters by staff member', async () => {
    const entries = await requests.listAudit()
    expect(entries.map((e) => e.date.getTime())).toEqual([...entries].map((e) => e.date.getTime()).sort((a, b) => b - a))
    const byPieter = await requests.listAudit({ search: 'pieter' })
    expect(byPieter.length).toBeGreaterThan(0)
    expect(new Set(byPieter.map((e) => e.actor.name))).toEqual(new Set(['Pieter van der Merwe']))
  })

  it('is read-only: a status change is refused with 403', async () => {
    expect(await rejection(requests.changeStatus('133', { newStatus: STATUS.ACCEPTED }))).toMatchObject({ status: 403 })
  })
})

describe('session', () => {
  it('refuses protected calls after sign-out', async () => {
    await auth.signIn(REQUESTER)
    auth.signOut()
    expect(auth.currentUser()).toBeNull()
    const error = await rejection(requests.listMine())
    expect(error).toBeInstanceOf(AppError)
    expect(error.status).toBe(401)
  })
})

describe('event bus (Observer)', () => {
  it('keeps delivering to other subscribers when one throws', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const received = []
    const local = createEventBus()
    local.subscribe('x', () => { throw new Error('boom') })
    local.subscribe('x', (payload) => received.push(payload))
    local.publish('x', 1)
    expect(received).toEqual([1])
    errors.mockRestore()
  })

  it('stops delivering after unsubscribe', () => {
    const local = createEventBus()
    const handler = vi.fn()
    const unsubscribe = local.subscribe('x', handler)
    unsubscribe()
    local.publish('x')
    expect(handler).not.toHaveBeenCalled()
  })
})
