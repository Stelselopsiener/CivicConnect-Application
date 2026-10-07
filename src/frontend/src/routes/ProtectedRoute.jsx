/**
 * Route guard — DESIGN PATTERN: Protection Proxy.
 *
 * Stands in front of a group of routes and decides whether the real screens may render:
 * signed out -> sign-in (remembering where the user was going); wrong role -> that role's own
 * home page, never an "access denied" dead end (REQ-029, PED §10.1).
 *
 * This is a usability control. The API checks the JWT and role again on every call (ASR-002).
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { homeFor } from '../domain/navigation'

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, user, signedOut } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return <Navigate to="/sign-in" replace state={signedOut ? null : { from: location }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}

/** "/" and any signed-in visit to an auth page land on the role's own home page. */
export function RoleHome() {
  const { user } = useAuth()
  return <Navigate to={homeFor(user?.role)} replace />
}
