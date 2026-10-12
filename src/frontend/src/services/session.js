/**
 * Session token storage and JWT reading.
 *
 * The API signs a JWT carrying userId, user_type and category (PED §12.2). The frontend only
 * *reads* the payload to decide which screens to show; it cannot verify the signature and does
 * not need to — every API call is checked again server-side (ASR-002).
 */
const TOKEN_KEY = 'civicconnect.token'

const memory = new Map()

/** localStorage with an in-memory fallback, so private windows and blocked storage still work. */
export const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return memory.get(key) ?? null
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      memory.set(key, value)
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      memory.delete(key)
    }
  },
}

export const getToken = () => storage.get(TOKEN_KEY)
export const saveToken = (token) => storage.set(TOKEN_KEY, token)
export const clearToken = () => storage.remove(TOKEN_KEY)

export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      [...atob(payload)].map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Payload of the stored token, or null if there is none or it has expired. */
export function readSession(now = Date.now()) {
  const token = getToken()
  if (!token) return null
  const claims = decodeJwt(token)
  if (!claims || (claims.exp && claims.exp * 1000 <= now)) {
    clearToken()
    return null
  }
  return claims
}
