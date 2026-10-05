import { getUsers, saveUsers, networkDelay } from './mockStore'

/**
 * Mirrors src/services/authService.js exactly (same function names,
 * same params, same return shapes) so pages never know which one they're
 * calling. See src/services/authService.js for the real endpoint contract
 * this substitutes for.
 */

function makeToken(userId) {
  return `mock.${userId}.${Date.now()}`
}

function tokenToUserId(token) {
  const parts = token?.split('.') || []
  return parts.length >= 2 ? parts[1] : null
}

function publicUser(user) {
  // Never return the mock password field, same as a real API wouldn't.
  const { password, ...rest } = user
  return rest
}

export async function login({ email, password }) {
  await networkDelay()
  const users = getUsers()
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
  if (!user) {
    const error = new Error('Incorrect email or password.')
    error.status = 401
    throw error
  }
  return { token: makeToken(user.id), user: publicUser(user) }
}

export async function register({ name, email, password }) {
  await networkDelay()
  const users = getUsers()
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    const error = new Error('An account with that email already exists.')
    error.status = 409
    throw error
  }
  const newUser = { id: `u${Date.now()}`, name, email, password, role: 'resident' }
  saveUsers([...users, newUser])
  return { token: makeToken(newUser.id), user: publicUser(newUser) }
}

export async function fetchCurrentUser() {
  await networkDelay(150)
  const token = localStorage.getItem('civicconnect_token')
  const userId = tokenToUserId(token)
  const user = getUsers().find((u) => u.id === userId)
  if (!user) {
    const error = new Error('Session expired. Please log in again.')
    error.status = 401
    throw error
  }
  return publicUser(user)
}
