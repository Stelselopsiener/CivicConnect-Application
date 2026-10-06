/**
 * Controlled request categories (S-IN-001, REQ-003) and the target-resolution rule (S-IN-010).
 *
 * `targetDays` is the number of calendar days after submission by which a request in that
 * category should be completed. "Overdue" is derived from it and never stored (D10).
 *
 * ASSUMPTION: the PED approves the rule ("created_at plus the approved number of days for the
 * category") but does not list the numbers. These values are the frontend's working defaults
 * and must be replaced by the approved figures; the API may also send `target_date` directly,
 * in which case the adapter uses the server's value.
 */
export const CATEGORIES = [
  { name: 'Facility fault', targetDays: 7, hint: 'Lights, doors, plumbing or power in a building' },
  { name: 'Equipment damage', targetDays: 10, hint: 'Broken furniture, tools or fittings' },
  { name: 'Security concern', targetDays: 2, hint: 'Locks, fences, lighting or suspicious activity' },
  { name: 'IT support', targetDays: 3, hint: 'Wi-Fi, computers, printers or accounts' },
  { name: 'Maintenance', targetDays: 7, hint: 'Repairs, leaks, grounds and cleaning' },
  { name: 'Lost property', targetDays: 14, hint: 'Something lost or found on the premises' },
  { name: 'Other', targetDays: 10, hint: 'Anything that does not fit above' },
]

export const CATEGORY_NAMES = CATEGORIES.map((category) => category.name)

const DEFAULT_TARGET_DAYS = 10

export function isKnownCategory(name) {
  return CATEGORY_NAMES.includes(name)
}

export function targetDaysFor(categoryName) {
  return CATEGORIES.find((category) => category.name === categoryName)?.targetDays ?? DEFAULT_TARGET_DAYS
}
