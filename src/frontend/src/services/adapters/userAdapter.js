/**
 * User adapter — DESIGN PATTERN: Adapter.
 * Converts the API's `user` record (PED §8: user_id, user_type, category) to the UI's shape.
 */
export function toUser(dto) {
  if (!dto) return null;

  // Added _id as a safety net depending on your database column naming
  const id = dto.user_id ?? dto.userId ?? dto.id ?? dto._id ?? dto.sub;

  if (id === undefined || id === null) return null;

  // Safely extract the role, checking all possible keys the backend might send
  const rawRole =
    dto.user_type ?? dto.userType ?? dto.role ?? dto.type ?? "requester";

  return {
    id: String(id),
    name: dto.name ?? "",
    email: dto.email ?? "",
    // FIX: Force lowercase so "Admin" or "Management" match the router arrays perfectly
    role: String(rawRole).toLowerCase(),
    category: dto.category ?? null,
  };
}

export function toSessionUser(responseUser, jwtClaims) {
  // Guard clause to prevent parsing completely empty payloads
  if (!responseUser && !jwtClaims) return null;

  const mergedDto = { ...(jwtClaims ?? {}), ...(responseUser ?? {}) };

  // TEMPORARY DEBUG: Press F12 and look at your Console after logging in.
  // This will show you exactly what data your frontend is receiving from the backend.
  console.log("🔍 JWT & API PAYLOAD COMBINED:", mergedDto);

  return toUser(mergedDto);
}
