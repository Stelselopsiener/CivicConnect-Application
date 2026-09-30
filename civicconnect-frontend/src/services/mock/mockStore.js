/**
 * Mock data store — simulates the PostgreSQL-backed Express API so the
 * frontend can be demoed and developed end-to-end before the backend
 * exists. Every function here mirrors the shape the real API is expected
 * to return (see authService.js / issueService.js contracts).
 *
 * Data lives in localStorage so it survives page reloads during a demo,
 * but is entirely separate from the real app's auth keys — clearing it
 * (see resetMockData) never touches a real backend.
 */

const USERS_KEY = 'civicconnect_mock_users'
const ISSUES_KEY = 'civicconnect_mock_issues'

const SEED_USERS = [
  { id: 'u1', name: 'Naledi Khumalo', email: 'resident@example.com', password: 'password123', role: 'resident' },
  { id: 'u2', name: 'Sipho Dlamini', email: 'staff@example.com', password: 'password123', role: 'staff' },
  { id: 'u3', name: 'Amara Botha', email: 'admin@example.com', password: 'password123', role: 'admin' },
]

const now = () => new Date().toISOString()
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString()

const SEED_ISSUES = [
  {
    id: 'i1',
    title: 'Large pothole outside the community hall',
    category: 'Roads & potholes',
    description:
      'A deep pothole has formed right at the entrance to the community hall parking lot. Two cars have already had tyre damage this week.',
    location: 'Community Hall, Church Street',
    status: 'reported',
    upvoteCount: 12,
    reportedBy: { id: 'u1', name: 'Naledi Khumalo' },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    comments: [
      { id: 'c1', body: 'Same here, nearly blew a tyre yesterday.', author: { id: 'u1', name: 'Naledi Khumalo' }, createdAt: daysAgo(1) },
    ],
  },
  {
    id: 'i2',
    title: 'Streetlight out on 5th Avenue',
    category: 'Electricity & streetlights',
    description: 'The streetlight between numbers 12 and 18 has been off for about a week, making the pavement unsafe at night.',
    location: '5th Avenue, near number 14',
    status: 'in_review',
    upvoteCount: 7,
    reportedBy: { id: 'u1', name: 'Naledi Khumalo' },
    createdAt: daysAgo(5),
    updatedAt: daysAgo(3),
    comments: [],
  },
  {
    id: 'i3',
    title: 'Water leak flooding the sidewalk',
    category: 'Water & sanitation',
    description: 'Steady water leak from what looks like a burst pipe under the sidewalk. Has been running for two days.',
    location: 'Corner of Main Road & Oak Street',
    status: 'in_progress',
    upvoteCount: 21,
    reportedBy: { id: 'u2', name: 'Sipho Dlamini' },
    createdAt: daysAgo(6),
    updatedAt: daysAgo(1),
    comments: [
      { id: 'c2', body: 'Municipal crew was on site this morning.', author: { id: 'u2', name: 'Sipho Dlamini' }, createdAt: daysAgo(1) },
    ],
  },
  {
    id: 'i4',
    title: 'Overflowing bin at the park entrance',
    category: 'Waste management',
    description: 'The bin at the main park entrance has been overflowing for several days and is starting to smell.',
    location: 'Riverside Park, main entrance',
    status: 'resolved',
    upvoteCount: 4,
    reportedBy: { id: 'u1', name: 'Naledi Khumalo' },
    createdAt: daysAgo(10),
    updatedAt: daysAgo(8),
    comments: [
      { id: 'c3', body: 'Collected and emptied — thanks for flagging.', author: { id: 'u3', name: 'Amara Botha' }, createdAt: daysAgo(8) },
    ],
  },
]

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function ensureSeeded() {
  if (!localStorage.getItem(USERS_KEY)) saveJSON(USERS_KEY, SEED_USERS)
  if (!localStorage.getItem(ISSUES_KEY)) saveJSON(ISSUES_KEY, SEED_ISSUES)
}

export function getUsers() {
  ensureSeeded()
  return loadJSON(USERS_KEY, SEED_USERS)
}

export function saveUsers(users) {
  saveJSON(USERS_KEY, users)
}

export function getIssues() {
  ensureSeeded()
  return loadJSON(ISSUES_KEY, SEED_ISSUES)
}

export function saveIssues(issues) {
  saveJSON(ISSUES_KEY, issues)
}

/** Simulates realistic network latency so loading states are visible. */
export function networkDelay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Clears all mock data and session state, restoring the seed dataset. */
export function resetMockData() {
  localStorage.removeItem(USERS_KEY)
  localStorage.removeItem(ISSUES_KEY)
  localStorage.removeItem('civicconnect_token')
  localStorage.removeItem('civicconnect_user')
  ensureSeeded()
}

export const DEMO_ACCOUNTS = SEED_USERS.map(({ email, password, role }) => ({ email, password, role }))
