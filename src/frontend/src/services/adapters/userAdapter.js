/**
 * User adapter — DESIGN PATTERN: Adapter.
 * Converts the API's `user` record (PED §8: user_id, user_type, category) to the UI's shape.
 */
export function toUser(dto) {
  if (!dto) return null;

  // Added _id as a safety net depending on your database column naming
  const id = dto.user_id ?? dto.userId ?? dto.id ?? dto._id ?? dto.sub;

  if (id === undefined || id === null) return null;

  return {
    id: String(id),
    name: dto.name ?? "Civic User",
    email: dto.email ?? "",
    // Defaulting to 'requester' prevents the ProtectedRoute from freezing on a null role
    role: dto.user_type ?? dto.userType ?? dto.role ?? "requester",
    category: dto.category ?? null,
  };
}

export function toSessionUser(responseUser, jwtClaims) {
  // Guard clause to prevent parsing completely empty payloads
  if (!responseUser && !jwtClaims) return null;
  return toUser({ ...(jwtClaims ?? {}), ...(responseUser ?? {}) });
}
