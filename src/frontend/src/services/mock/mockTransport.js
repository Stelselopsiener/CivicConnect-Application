/**
 * Demo API — the second transport STRATEGY (see services/index.js).
 *
 * Exposes the same { get, post, patch } interface as httpTransport and answers the same paths
 * with the same JSON and the same §12.4 error envelope, so the gateways, adapters and screens
 * run unchanged. It behaves like the PED says the server will: role and category scoping
 * (ASR-002), D10 transitions with 409 Conflict, duplicate detection (REQ-031), email
 * confirmation before first sign-in (D13).
 *
 * It is a stand-in for demonstration and development. It proves nothing about the real API.
 */
import { isKnownCategory } from '../../domain/categories'
import { LifecycleError, OPEN_STATUSES, ROLE, STATUS, assertTransition, isOpen } from '../../domain/requestLifecycle'
import { daysBetween, isOverdue, median, parseReference, targetDateFor } from '../../domain/requestRules'
import { AppError, ERROR_CODE } from '../AppError'
import { decodeJwt, getToken } from '../session'
import { loadDb, saveDb } from './mockDb'

const LATENCY_MS = import.meta.env?.MODE === 'test' ? 0 : 220
const SESSION_HOURS = 8

const fail = (status, code, message, details = []) => {
  throw new AppError({ status, code, message, details })
}

// ---------- helpers ----------------------------------------------------------------------

const base64Url = (value) => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

function issueToken(user) {
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    userId: user.user_id, name: user.name, email: user.email, user_type: user.user_type,
    category: user.category, iat: now, exp: now + SESSION_HOURS * 3600,
  }
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(claims)}.demo`
}

const randomToken = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('')

function authenticate(db, ...roles) {
  const claims = decodeJwt(getToken() ?? '')
  const user = claims && claims.exp * 1000 > Date.now() ? db.users.find((u) => u.user_id === claims.userId) : null
  if (!user) fail(401, ERROR_CODE.UNAUTHENTICATED, 'Your session has ended. Sign in again.')
  if (roles.length && !roles.includes(user.user_type)) fail(403, ERROR_CODE.FORBIDDEN, 'Your account is not allowed to do that.')
  return user
}

const publicUser = ({ user_id, name, email, user_type, category }) => ({ user_id, name, email, user_type, category })

function requestDto(db, row) {
  const requester = db.users.find((u) => u.user_id === row.requester_id)
  const staff = db.users.find((u) => u.user_id === row.staff_id)
  return {
    ...row,
    requester: requester ? { user_id: requester.user_id, name: requester.name, email: requester.email } : null,
    staff: staff ? { user_id: staff.user_id, name: staff.name } : null,
    actions: db.actions.filter((a) => a.service_request_id === row.service_request_id),
  }
}

function findRequest(db, id) {
  const row = db.requests.find((r) => String(r.service_request_id) === String(id))
  if (!row) fail(404, ERROR_CODE.NOT_FOUND, 'That request could not be found.')
  return row
}

/** One enforcement point for "may this user see this request?" (ASR-002). */
function assertCanView(user, row) {
  const allowed =
    user.user_type === ROLE.MANAGEMENT ||
    (user.user_type === ROLE.REQUESTER && row.requester_id === user.user_id) ||
    (user.user_type === ROLE.STAFF && row.category === user.category)
  // 404 rather than 403, so the response does not confirm that someone else's request exists.
  if (!allowed) fail(404, ERROR_CODE.NOT_FOUND, 'That request could not be found.')
}

function recordAction(db, row, actor, { newStatus, previousStatus, comment, actionType, detail = null }) {
  const isStaff = actor?.user_type === ROLE.STAFF
  db.actions.push({
    action_id: db.nextActionId++, service_request_id: row.service_request_id,
    staff_id: isStaff ? actor.user_id : null, staff_name: isStaff ? actor.name : null,
    previous_status: previousStatus, new_status: newStatus, date: new Date().toISOString(),
    comment, action_type: actionType, detail,
  })
}

const rowIsOverdue = (row) =>
  isOverdue({ status: row.status, targetDate: targetDateFor(row.created_at, row.category) })

function matchesStatus(row, status) {
  if (!status) return true
  if (status === 'open') return isOpen(row.status)
  if (status === 'overdue') return rowIsOverdue(row)
  return row.status === status
}

function matchesSearch(row, search) {
  if (!search) return true
  const id = parseReference(search)
  if (id) return String(row.service_request_id) === id
  const needle = search.trim().toLowerCase()
  return [row.title, row.street_address, row.description].some((field) => field.toLowerCase().includes(needle))
}

const inDateRange = (iso, start, end) => (!start || iso.slice(0, 10) >= start) && (!end || iso.slice(0, 10) <= end)

// ---------- route handlers ---------------------------------------------------------------

const routes = [
  ['POST', '/auth/register', (db, { body }) => {
    const { name, email, password } = body
    if (!name?.trim() || !email?.trim() || (password ?? '').length < 8) {
      fail(400, ERROR_CODE.VALIDATION, 'Enter your name, a valid email address and a password of at least 8 characters.')
    }
    const generic = { message: 'If the address can be used, a confirmation link has been emailed to it.' }
    // No account enumeration (OWASP, D13): an existing address gets the same answer.
    if (db.users.some((u) => u.email === email)) return [201, generic]
    const verification_token = randomToken()
    db.users.push({
      user_id: db.nextUserId++, name, email, password, user_type: ROLE.REQUESTER, category: null,
      email_verified: false, verification_token,
    })
    // `demo_verification_token` stands in for the email inbox. The real API never returns it.
    return [201, { ...generic, demo_verification_token: verification_token }]
  }],

  ['POST', '/auth/resend-verification', (db, { body }) => {
    const user = db.users.find((u) => u.email === body.email && !u.email_verified)
    const generic = { message: 'If that account is waiting for confirmation, a new link has been emailed.' }
    if (!user) return [200, generic]
    user.verification_token = randomToken() // overwriting invalidates the old link
    return [200, { ...generic, demo_verification_token: user.verification_token }]
  }],

  ['POST', '/auth/verify-email', (db, { body }) => {
    const user = body.token && db.users.find((u) => u.verification_token === body.token)
    if (!user) fail(400, ERROR_CODE.TOKEN_INVALID, 'This confirmation link has already been used or has expired. Request a new one.')
    user.email_verified = true
    user.verification_token = null // single use
    return [200, { message: 'Email confirmed. You can sign in now.' }]
  }],

  ['POST', '/auth/login', (db, { body }) => {
    const user = db.users.find((u) => u.email === body.email && u.password === body.password)
    if (!user) fail(401, ERROR_CODE.INVALID_CREDENTIALS, 'Email or password is incorrect.')
    if (!user.email_verified) fail(403, ERROR_CODE.EMAIL_NOT_VERIFIED, 'Please confirm your email first.')
    return [200, { token: issueToken(user), user: publicUser(user) }]
  }],

  ['POST', '/requests', (db, { body }) => {
    const user = authenticate(db, ROLE.REQUESTER)
    const details = []
    for (const field of ['title', 'description', 'street_address', 'start_date']) {
      if (!String(body[field] ?? '').trim()) details.push({ field, message: 'This field is required.' })
    }
    if (!isKnownCategory(body.category)) details.push({ field: 'category', message: 'Choose one of the listed categories.' })
    if (body.end_date && body.end_date < body.start_date) {
      details.push({ field: 'end_date', message: 'End date cannot be before the start date.' })
    }
    if (details.length) fail(400, ERROR_CODE.VALIDATION, 'Some fields need attention.', details)

    const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()
    const duplicate = db.requests.find(
      (r) => r.requester_id === user.user_id && isOpen(r.status) && same(r.title, body.title) && same(r.street_address, body.street_address),
    )
    if (duplicate) {
      fail(409, ERROR_CODE.DUPLICATE_REQUEST, 'You already have an open request with this title and address.', [
        { field: 'service_request_id', message: String(duplicate.service_request_id) },
      ])
    }

    const row = {
      service_request_id: db.nextRequestId++, requester_id: user.user_id, staff_id: null, title: body.title,
      description: body.description, street_address: body.street_address, start_date: body.start_date,
      end_date: body.end_date || null, category: body.category, status: STATUS.PENDING, created_at: new Date().toISOString(),
    }
    db.requests.push(row)
    recordAction(db, row, null, { newStatus: STATUS.PENDING, previousStatus: null, comment: 'We received your request.', actionType: 'Submitted' })
    return [201, requestDto(db, row)]
  }],

  ['GET', '/requests/my', (db) => {
    const user = authenticate(db, ROLE.REQUESTER)
    return [200, { requests: db.requests.filter((r) => r.requester_id === user.user_id).map((r) => requestDto(db, r)) }]
  }],

  ['GET', '/requests/:id', (db, { params }) => {
    const user = authenticate(db)
    const row = findRequest(db, params.id)
    assertCanView(user, row)
    return [200, requestDto(db, row)]
  }],

  ['GET', '/staff/requests', (db, { query }) => {
    const user = authenticate(db, ROLE.STAFF)
    const rows = db.requests.filter(
      (r) => r.category === user.category && matchesStatus(r, query.status) && matchesSearch(r, query.search),
    )
    return [200, { requests: rows.map((r) => requestDto(db, r)) }]
  }],

  ['GET', '/staff/members', (db, { query }) => {
    const user = authenticate(db, ROLE.STAFF)
    const category = query.category || user.category
    return [200, { members: db.users.filter((u) => u.user_type === ROLE.STAFF && u.category === category).map(publicUser) }]
  }],

  ['PATCH', '/requests/:id/assign', (db, { params, body }) => {
    const user = authenticate(db, ROLE.STAFF)
    const row = findRequest(db, params.id)
    assertCanView(user, row)
    const owner = db.users.find((u) => u.user_id === Number(body.staff_id))
    if (!owner || owner.user_type !== ROLE.STAFF || owner.category !== row.category) {
      fail(400, ERROR_CODE.VALIDATION, `Choose an active staff member in ${row.category}.`)
    }
    if (!isOpen(row.status)) fail(409, ERROR_CODE.INVALID_TRANSITION, `A ${row.status.toLowerCase()} request cannot be reassigned.`)
    if (row.staff_id === owner.user_id) fail(409, ERROR_CODE.INVALID_TRANSITION, `${owner.name} already owns this request.`)

    const previousStatus = row.status
    // Taking ownership of a Pending request accepts it: "Accepted (a staff owner exists)" (D10).
    if (row.status === STATUS.PENDING) row.status = STATUS.ACCEPTED
    row.staff_id = owner.user_id
    const comment = owner.user_id === user.user_id ? `${owner.name} accepted this request.` : `Assigned to ${owner.name}.`
    recordAction(db, row, user, { newStatus: row.status, previousStatus, comment, actionType: 'Assigned' })
    return [200, requestDto(db, row)]
  }],

  ['PATCH', '/requests/:id/category', (db, { params, body }) => {
    const user = authenticate(db, ROLE.STAFF)
    const row = findRequest(db, params.id)
    assertCanView(user, row)
    if (!isKnownCategory(body.category)) fail(400, ERROR_CODE.VALIDATION, 'Choose one of the listed categories.')
    if (body.category === row.category) fail(409, ERROR_CODE.INVALID_TRANSITION, `The request is already in ${row.category}.`)
    if (row.status !== STATUS.PENDING) {
      fail(409, ERROR_CODE.INVALID_TRANSITION, 'The category can only be corrected while a request is Pending.')
    }
    const detail = `${row.category} → ${body.category}`
    row.category = body.category
    recordAction(db, row, user, {
      newStatus: row.status, previousStatus: row.status, comment: `Moved to the ${body.category} team.`,
      actionType: 'Category corrected', detail,
    })
    return [200, requestDto(db, row)]
  }],

  ['PATCH', '/requests/:id/status', (db, { params, body }) => {
    const user = authenticate(db, ROLE.STAFF, ROLE.REQUESTER)
    const row = findRequest(db, params.id)
    assertCanView(user, row)
    const comment = String(body.comment ?? '').trim()
    const previousStatus = row.status

    if (body.new_status === row.status) {
      // Comment-only action: status unchanged, staff only.
      if (user.user_type !== ROLE.STAFF) fail(403, ERROR_CODE.FORBIDDEN, 'Only staff can add updates to a request.')
      if (!comment) fail(400, ERROR_CODE.VALIDATION, 'Write the update before saving.')
      recordAction(db, row, user, { newStatus: row.status, previousStatus, comment, actionType: 'Comment added' })
      return [200, requestDto(db, row)]
    }

    try {
      assertTransition(row.status, body.new_status, user.user_type, { comment })
    } catch (error) {
      if (!(error instanceof LifecycleError)) throw error
      const validation = error.code === 'COMMENT_REQUIRED'
      fail(validation ? 400 : 409, validation ? ERROR_CODE.VALIDATION : ERROR_CODE.INVALID_TRANSITION, error.message)
    }
    row.status = body.new_status
    if (body.new_status === STATUS.ACCEPTED && !row.staff_id) row.staff_id = user.user_id
    const fallback = user.user_type === ROLE.REQUESTER ? 'Cancelled by the requester.' : `Status changed to ${row.status}.`
    recordAction(db, row, user, { newStatus: row.status, previousStatus, comment: comment || fallback, actionType: 'Status change' })
    return [200, requestDto(db, row)]
  }],

  ['GET', '/admin/overview', (db, { query }) => {
    authenticate(db, ROLE.MANAGEMENT)
    const rows = db.requests.filter(
      (r) => inDateRange(r.created_at, query.start_date, query.end_date) && (!query.category || r.category === query.category),
    )
    const count = (predicate) => rows.filter(predicate).length
    const byCategory = (predicate) => {
      const totals = new Map()
      for (const row of rows.filter(predicate)) totals.set(row.category, [...(totals.get(row.category) ?? []), row])
      return totals
    }
    const completionDays = rows
      .map((row) => {
        const done = db.actions.find((a) => a.service_request_id === row.service_request_id && a.new_status === STATUS.COMPLETED && a.previous_status !== STATUS.COMPLETED)
        return done ? daysBetween(row.created_at, done.date) : null
      })
      .filter((days) => days !== null)
    const medianDays = median(completionDays)
    const overdueDays = (row) => Math.max(1, Math.round(daysBetween(targetDateFor(row.created_at, row.category), new Date())))

    return [200, {
      counts: {
        open: count((r) => OPEN_STATUSES.includes(r.status)),
        overdue: count(rowIsOverdue),
        resolved: count((r) => r.status === STATUS.COMPLETED),
        closed: count((r) => r.status === STATUS.CLOSED),
      },
      median_days_to_complete: medianDays === null ? null : Math.round(medianDays * 10) / 10,
      open_by_category: [...byCategory((r) => isOpen(r.status))].map(([category, list]) => ({ category, count: list.length })),
      overdue_by_category: [...byCategory(rowIsOverdue)].map(([category, list]) => ({
        category, count: list.length, oldest_days: Math.max(...list.map(overdueDays)),
      })),
    }]
  }],

  ['GET', '/admin/audit', (db, { query }) => {
    authenticate(db, ROLE.MANAGEMENT)
    const id = parseReference(query.search)
    const needle = (query.search ?? '').trim().toLowerCase()
    const entries = db.actions
      .filter((a) => inDateRange(a.date, query.start_date, query.end_date))
      .filter((a) => !query.action_type || a.action_type === query.action_type)
      .filter((a) => !needle || (id ? String(a.service_request_id) === id : (a.staff_name ?? '').toLowerCase().includes(needle)))
      .sort((a, b) => b.date.localeCompare(a.date))
    return [200, { entries }]
  }],

  ['GET', '/admin/requests', (db, { query }) => {
    authenticate(db, ROLE.MANAGEMENT)
    const rows = db.requests.filter(
      (r) => matchesStatus(r, query.status) && matchesSearch(r, query.search) && (!query.category || r.category === query.category),
    )
    return [200, { requests: rows.map((r) => requestDto(db, r)) }]
  }],
].map(([method, path, handler]) => ({
  method,
  handler,
  pattern: new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
}))

// ---------- transport --------------------------------------------------------------------

async function handle(method, url, { query = {}, body = {} } = {}) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
  const db = loadDb()
  for (const route of routes) {
    const match = route.method === method && url.match(route.pattern)
    if (!match) continue
    const [, payload] = route.handler(db, { params: match.groups ?? {}, query, body })
    saveDb()
    return structuredClone(payload)
  }
  return fail(404, ERROR_CODE.NOT_FOUND, `No demo route for ${method} ${url}.`)
}

export const mockTransport = {
  get: (url, params) => handle('GET', url, { query: params }),
  post: (url, body) => handle('POST', url, { body }),
  patch: (url, body) => handle('PATCH', url, { body }),
}
