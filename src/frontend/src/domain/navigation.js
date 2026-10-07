/**
 * Role-based navigation — DESIGN PATTERN: Factory Method.
 *
 * `navigationFor(role)` builds the menu for the signed-in user's `user_type`. Menu items a role
 * cannot use are never created, so there are no "access denied" dead ends (REQ-029, ASR-002,
 * PED §10.1). ProtectedRoute still guards the routes themselves, and the API is the authority.
 */
import { ROLE } from './requestLifecycle'

const NAVIGATION = {
  [ROLE.REQUESTER]: {
    home: '/requests',
    label: 'Requester',
    items: [
      { to: '/requests/new', label: 'New request' },
      { to: '/requests', label: 'My requests', end: true },
    ],
  },
  [ROLE.STAFF]: {
    home: '/worklist',
    label: 'Staff',
    items: [{ to: '/worklist', label: 'Worklist' }],
  },
  [ROLE.MANAGEMENT]: {
    home: '/oversight',
    label: 'Management',
    items: [
      { to: '/oversight', label: 'Oversight' },
      { to: '/audit', label: 'Audit trail' },
      { to: '/all-requests', label: 'All requests' },
    ],
  },
}

const SIGNED_OUT = { home: '/sign-in', label: '', items: [] }

export function navigationFor(role) {
  return NAVIGATION[role] ?? SIGNED_OUT
}

export function homeFor(role) {
  return navigationFor(role).home
}

/** "Staff · Maintenance" for staff, the plain role label otherwise. */
export function roleLabel(user) {
  const { label } = navigationFor(user?.role)
  return user?.role === ROLE.STAFF && user.category ? `${label}, ${user.category}` : label
}
