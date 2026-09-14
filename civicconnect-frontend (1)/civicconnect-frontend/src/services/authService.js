import apiClient from './apiClient'
import * as mockAuthService from './mock/mockAuthService'

/**
 * Auth service — the expected contract for the Express/PostgreSQL backend.
 *
 * Expected endpoints (align with your ADR + RTM):
 *   POST /api/auth/register   { name, email, password }        -> { token, user }
 *   POST /api/auth/login      { email, password }               -> { token, user }
 *   GET  /api/auth/me         (Authorization: Bearer <token>)    -> { user }
 *
 * `user` shape assumed: { id, name, email, role }  where role is
 * 'resident' | 'staff' | 'admin'. Adjust here (only) if the backend team
 * finalises a different contract — no other file should need to change.
 *
 * MOCK MODE: when VITE_USE_MOCK_API=true, every function below delegates
 * to src/services/mock/mockAuthService.js instead of calling the real
 * API, so the app is fully usable before the backend exists. Delete the
 * mock branch (and the mock/ folder) once the real API is ready — no
 * page or component needs to change either way.
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true'

export async function login(credentials) {
  if (USE_MOCK) return mockAuthService.login(credentials)
  const { data } = await apiClient.post('/auth/login', credentials)
  return data
}

export async function register(details) {
  if (USE_MOCK) return mockAuthService.register(details)
  const { data } = await apiClient.post('/auth/register', details)
  return data
}

export async function fetchCurrentUser() {
  if (USE_MOCK) return mockAuthService.fetchCurrentUser()
  const { data } = await apiClient.get('/auth/me')
  return data.user
}
