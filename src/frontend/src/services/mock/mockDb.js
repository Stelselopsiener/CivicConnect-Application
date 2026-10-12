/**
 * Demo database. Three tables shaped like PED §8.2 (user, service_request, action), kept in
 * the browser so the product can be loaded and demonstrated without the Express API.
 *
 * DEMO ONLY: passwords here are plain text because nothing leaves the browser. The real API
 * stores bcrypt hashes (ASR-003) and this folder is not used when VITE_USE_MOCK_API=false.
 */
import { STATUS } from '../../domain/requestLifecycle'
import { storage } from '../session'

const DB_KEY = 'civicconnect.demo.v1'
const DAY = 24 * 60 * 60 * 1000

export const DEMO_PASSWORD = 'Demo-pass-2026'

const { PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CLOSED, REJECTED, CANCELLED } = STATUS

const user = (user_id, name, email, user_type, category = null) => ({
  user_id, name, email, password: DEMO_PASSWORD, user_type, category, email_verified: true, verification_token: null,
})

const USERS = [
  user(1, 'Thandi Mokoena', 'thandi.m@example.org', 'requester'),
  user(2, 'Sizwe Radebe', 'sizwe.r@example.org', 'requester'),
  user(3, 'Anika Pillay', 'anika.p@example.org', 'requester'),
  user(10, 'Pieter van der Merwe', 'pieter.vdm@civicconnect.example', 'staff', 'Maintenance'),
  user(11, 'Sipho Dlamini', 'sipho.d@civicconnect.example', 'staff', 'Maintenance'),
  user(12, 'Johan Botha', 'johan.b@civicconnect.example', 'staff', 'Facility fault'),
  user(13, 'Lerato Khoza', 'lerato.k@civicconnect.example', 'staff', 'IT support'),
  user(14, 'Nomsa Zulu', 'nomsa.z@civicconnect.example', 'staff', 'Security concern'),
  user(15, 'Zanele Mthembu', 'zanele.m@civicconnect.example', 'staff', 'Equipment damage'),
  user(16, 'Fatima Ismail', 'fatima.i@civicconnect.example', 'staff', 'Lost property'),
  user(20, 'Lindiwe Nkosi', 'lindiwe.n@civicconnect.example', 'management'),
]

export const DEMO_ACCOUNTS = [
  { label: 'Requester', name: 'Thandi Mokoena', email: 'thandi.m@example.org' },
  { label: 'Staff, Maintenance', name: 'Pieter van der Merwe', email: 'pieter.vdm@civicconnect.example' },
  { label: 'Management', name: 'Lindiwe Nkosi', email: 'lindiwe.n@civicconnect.example' },
]

/**
 * Seed requests: [id, requester, category, title, address, description, createdDaysAgo, steps]
 * where each step is [daysAgo, newStatus, staffId, comment].
 */
const REQUESTS = [
  [142, 1, 'Facility fault', 'Street light out on corner of Oak and 3rd Ave', 'Corner of Oak Ave and 3rd Ave, Midrand',
    'The street light has been off for 4 nights. The corner is very dark and people walk there after the taxi rank closes.', 0.2, []],
  [138, 2, 'Facility fault', 'Toilet door will not lock at the clinic', 'Ward 7 clinic, 4 Clinic Rd',
    'The lock on the second cubicle in the public toilets is broken and the door swings open.', 1, []],
  [136, 2, 'Maintenance', 'Blocked storm drain behind the community hall', 'Ward 7 community hall, 12 Church St',
    'The drain behind the hall is full of leaves and the parking area floods when it rains.', 1.3, []],
  [133, 3, 'Maintenance', 'Fence panel down at the depot', 'Depot, Main Rd',
    'One palisade panel on the Main Rd side has come loose and is lying flat.', 4, []],
  [130, 2, 'Security concern', 'Broken padlock on pump house gate', 'Pump house, River Rd',
    'The padlock has been cut and the gate is standing open.', 3, []],
  [128, 1, 'Maintenance', 'Broken tap in community hall kitchen', 'Ward 7 community hall, 12 Church St',
    'The cold tap in the kitchen does not close and water runs all day.', 6, [
      [5, ACCEPTED, 10, 'Accepted by the Maintenance team.'],
      [0.1, IN_PROGRESS, 10, 'Plumber booked for Thursday. Water to the kitchen has been shut off at the valve for now.'],
    ]],
  [125, 3, 'Facility fault', 'Stage lights flickering in the main hall', 'Ward 7 community hall, 12 Church St',
    'The three lights above the stage flicker and sometimes trip the breaker.', 9, [
      [8, ACCEPTED, 12, 'Electrician asked for a quote.'],
    ]],
  [121, 2, 'Maintenance', 'Tap leaking in library toilets', 'Library, 1 Park Ln',
    'The basin tap in the ladies toilets drips constantly and the floor is wet.', 12, [
      [11, ACCEPTED, 10, 'Accepted by the Maintenance team.'],
      [9, IN_PROGRESS, 10, 'Washer replaced but the tap body is cracked. Replacement tap ordered.'],
    ]],
  [119, 2, 'Equipment damage', 'Cracked bench in clinic waiting room', 'Ward 7 clinic, 4 Clinic Rd',
    'The long wooden bench has split along one plank and pinches when people sit.', 8, [
      [7, ACCEPTED, 15, 'Bench moved out of the waiting room.'],
      [3, IN_PROGRESS, 15, 'Carpenter is replacing the plank this week.'],
    ]],
  [117, 1, 'IT support', 'Library Wi-Fi not connecting', 'Library, 1 Park Ln',
    'The public Wi-Fi shows as connected but no pages load on any device.', 2, [
      [1.5, ACCEPTED, 13, 'We will check the router on our next visit to the library.'],
    ]],
  [112, 3, 'IT support', 'Boardroom projector shows no signal', 'Municipal offices, 2 Main Rd',
    'The projector powers on but says "no signal" on HDMI and on the wireless display.', 5, [
      [4.5, ACCEPTED, 13, 'Accepted by IT support.'],
      [4, IN_PROGRESS, 13, 'HDMI cable replaced, fault remains. Testing the projector input board.'],
    ]],
  [109, 2, 'Maintenance', 'Roof leak above clinic waiting room', 'Ward 7 clinic, 4 Clinic Rd',
    'Water drips through the ceiling near the reception window when it rains.', 16, [
      [15, ACCEPTED, 11, 'Roof inspection scheduled.'],
    ]],
  [104, 3, 'Maintenance', 'Window latch broken in hall office', 'Ward 7 community hall, 12 Church St',
    'The office window cannot be closed properly because the latch has snapped.', 20, [
      [19, ACCEPTED, 10, 'Accepted by the Maintenance team.'],
      [17, IN_PROGRESS, 10, 'Latch on order.'],
      [15, COMPLETED, 10, 'New latch fitted and tested. The window closes and locks.'],
    ]],
  [101, 3, 'IT support', 'Front desk printer keeps jamming', 'Municipal offices, 2 Main Rd',
    'Every second page jams in the rear tray.', 22, [
      [21.5, ACCEPTED, 13, 'Accepted by IT support.'],
      [21, IN_PROGRESS, 13, 'Rollers are worn. Replacing them.'],
      [20, COMPLETED, 13, 'Feed rollers replaced. Printed 50 test pages with no jam.'],
    ]],
  [99, 2, 'Security concern', 'Perimeter light out at the depot', 'Depot, Main Rd',
    'The floodlight on the back fence has not come on this week.', 28, [
      [27.5, ACCEPTED, 14, 'Accepted by Security.'],
      [27, IN_PROGRESS, 14, 'Sensor fault found.'],
      [26, COMPLETED, 14, 'Day/night sensor replaced. Light comes on at dusk again.'],
      [24, CLOSED, 14, 'Checked for two nights. Closed.'],
    ]],
  [96, 1, 'Equipment damage', 'Gate lock damaged at sports field', 'Sports field, Park Ln',
    'The lock on the main gate has been forced and no longer latches.', 30, [
      [29, ACCEPTED, 15, 'Accepted by the Equipment team.'],
      [28, IN_PROGRESS, 15, 'Temporary chain fitted. New lock ordered.'],
      [25, COMPLETED, 15, 'New lock fitted. Keys are with the caretaker.'],
    ]],
  [90, 3, 'Maintenance', 'Grass overgrown at Ward 7 play park', 'Play park, Church St',
    'The grass is knee high around the swings and children cannot use them.', 35, [
      [34, ACCEPTED, 11, 'Added to the grounds team schedule.'],
      [31, IN_PROGRESS, 11, 'Grounds team on site.'],
      [30, COMPLETED, 11, 'Grass cut and edges trimmed.'],
      [28, CLOSED, 11, 'Closed after site check.'],
    ]],
  [85, 1, 'Other', 'Extra bins for market day', 'Market square, Main Rd',
    'Could we have four extra bins on the square for the monthly market?', 40, [
      [39, CANCELLED, null, 'Cancelled by the requester.'],
    ]],
  [81, 1, 'Lost property', 'Lost blue backpack at clinic', 'Ward 7 clinic, 4 Clinic Rd',
    'I left a blue backpack on a chair in the waiting room on Tuesday morning.', 41, [
      [40, REJECTED, 16, 'Nothing matching this description was handed in. Please ask at clinic reception, which keeps found items for 30 days.'],
    ]],
]

function seed(now = Date.now()) {
  // Older entries are moved into office hours (order is preserved) so the demo reads like real work.
  const at = (daysAgo) => {
    const date = new Date(now - daysAgo * DAY)
    if (daysAgo >= 1) {
      const minutes = Math.round((daysAgo * 977) % 50)
      if (date.getHours() < 8) date.setHours(8, minutes)
      else if (date.getHours() >= 16) date.setHours(15, minutes)
      else date.setMinutes(minutes)
    }
    return date.toISOString()
  }
  const day = (daysAgo) => at(daysAgo).slice(0, 10)
  const nameOf = (id) => USERS.find((u) => u.user_id === id)?.name ?? null
  const requests = []
  const actions = []
  let actionId = 500

  for (const [id, requesterId, category, title, address, description, createdDaysAgo, steps] of REQUESTS) {
    let status = PENDING
    let staffId = null
    actions.push({
      action_id: actionId++, service_request_id: id, staff_id: null, staff_name: null, previous_status: null,
      new_status: PENDING, date: at(createdDaysAgo), comment: 'We received your request.', action_type: 'Submitted',
    })
    for (const [daysAgo, newStatus, actor, comment] of steps) {
      actions.push({
        action_id: actionId++, service_request_id: id, staff_id: actor, staff_name: nameOf(actor),
        previous_status: status, new_status: newStatus, date: at(daysAgo), comment,
        action_type: newStatus === ACCEPTED ? 'Assigned' : 'Status change',
      })
      status = newStatus
      if (actor) staffId = actor
    }
    requests.push({
      service_request_id: id, requester_id: requesterId, staff_id: staffId, title, description,
      street_address: address, start_date: day(createdDaysAgo + 1), end_date: null, category, status,
      created_at: at(createdDaysAgo),
    })
  }

  return { users: structuredClone(USERS), requests, actions, nextRequestId: 143, nextActionId: actionId, nextUserId: 30 }
}

let cache = null

export function loadDb() {
  if (cache) return cache
  try {
    cache = JSON.parse(storage.get(DB_KEY))
  } catch {
    cache = null
  }
  if (!cache?.users) {
    cache = seed()
    saveDb()
  }
  return cache
}

export function saveDb() {
  storage.set(DB_KEY, JSON.stringify(cache))
}

export function resetDb() {
  cache = seed()
  saveDb()
}
