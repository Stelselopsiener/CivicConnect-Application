/**
 * User adapter — DESIGN PATTERN: Adapter.
 * Converts the API's `user` record (PED §8: user_id, user_type, category) to the UI's shape.
 */
export function toUser(dto) {
  if (!dto) return null
  const id = dto.user_id ?? dto.userId ?? dto.id ?? dto.sub
  if (id === undefined || id === null) return null
  return {
    id: String(id),
    name: dto.name ?? '',
    email: dto.email ?? '',
    role: dto.user_type ?? dto.userType ?? dto.role ?? null,
    category: dto.category ?? null,
  }
}

/** A sign-in response carries the JWT and, optionally, the user; the JWT claims are the fallback. */
export function toSessionUser(responseUser, jwtClaims) {
  return toUser({ ...(jwtClaims ?? {}), ...(responseUser ?? {}) })
}
