# CivicConnect frontend

React single-page app for CivicConnect, the community service-request platform (SEN381, Milestone 3). It implements the screens wireframed in PED v2.0 §10 against the API contract in PED §12.2.

Design patterns and where to find them: **[DESIGN_PATTERNS.md](DESIGN_PATTERNS.md)**.

## Run it

```bash
npm install
cp .env.example .env     # Windows: copy .env.example .env
npm run dev              # http://localhost:5173
```

| Command | Does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | Static analysis (oxlint) |
| `npm test` | 84 unit and service-layer tests (Vitest) |

Requires Node.js 20 or newer.

## Demo mode and live mode

`VITE_USE_MOCK_API` selects the data source. Pages are identical in both modes.

| Value | Data source | Use for |
|---|---|---|
| `true` (default) | In-browser demo API with seeded data, stored in `localStorage` | Demonstrations and frontend work without a backend. An amber banner makes the mode obvious. |
| `false` | Express API at `VITE_API_BASE_URL` (default `/api/v1`) | Integration with the real backend |

Demo accounts (password `Demo-pass-2026`, also one click from the sign-in page):

| Account | Role |
|---|---|
| thandi.m@example.org | Requester |
| pieter.vdm@civicconnect.example | Staff, Maintenance |
| lindiwe.n@civicconnect.example | Management |

The demo API enforces the same rules the PED gives the server (role and category scoping, D10 transitions with 409, duplicate detection, email confirmation before first sign-in). It is a stand-in: it is not evidence that the real API behaves that way.

## Backend integration status

**The backend in this repository does not yet serve this frontend.** At the time of writing `src/backend` exposes one route, `GET /api/requests`, with no authentication. Live mode needs the endpoints below under `/api/v1`. Until they exist, run demo mode.

| Endpoint | Used by | In PED §12.2 |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | Sign in, Create account | Yes |
| `POST /auth/verify-email`, `POST /auth/resend-verification` | Confirm email | §11.3 (D13) |
| `POST /requests`, `GET /requests/my` | Submit, My requests | Yes |
| `GET /requests/:id` | Request detail, workspace | **No: contract gap** (needed for REQ-009) |
| `GET /staff/requests`, `GET /staff/members` | Worklist, assign list | Yes |
| `PATCH /requests/:id/assign`, `/category`, `/status` | Workspace | Yes |
| `GET /admin/overview`, `GET /admin/audit` | Oversight, Audit trail | Yes |
| `GET /admin/requests` | All requests (management) | **No: contract gap** (wireframed screen) |

JSON shapes the frontend expects (all tolerant of missing optional fields; see `src/services/adapters/`):

```jsonc
// POST /auth/login -> 200
{ "token": "<JWT with userId, user_type, category, exp>", "user": { "user_id": 10, "name": "…", "email": "…", "user_type": "staff", "category": "Maintenance" } }

// a request, wherever one is returned (lists may be a bare array or { "requests": [...] })
{ "service_request_id": 128, "requester_id": 1, "staff_id": 10, "title": "…", "description": "…",
  "street_address": "…", "start_date": "2026-09-29", "end_date": null, "category": "Maintenance",
  "status": "In Progress", "created_at": "2026-09-30T08:10:00Z",
  "requester": { "user_id": 1, "name": "…", "email": "…" }, "staff": { "user_id": 10, "name": "…" },
  "actions": [ { "action_id": 501, "service_request_id": 128, "staff_id": 10, "staff_name": "…",
                 "previous_status": "Accepted", "new_status": "In Progress", "date": "…", "comment": "…", "action_type": "Status change" } ] }

// GET /admin/overview -> 200
{ "counts": { "open": 11, "overdue": 5, "resolved": 4, "closed": 2 }, "median_days_to_complete": 4.5,
  "open_by_category": [ { "category": "Maintenance", "count": 4 } ],
  "overdue_by_category": [ { "category": "Maintenance", "count": 2, "oldest_days": 9 } ] }

// any failure (PED §12.4)
{ "error": { "code": "INVALID_TRANSITION", "message": "…", "details": [ { "field": "end_date", "message": "…" } ] } }
```

Error codes the UI treats specially: `EMAIL_NOT_VERIFIED` (403, offers resend), `INVALID_CREDENTIALS` (401), `DUPLICATE_REQUEST` (409, `details[0].message` = existing request id), `INVALID_TRANSITION` (409).

In development Vite proxies `/api/*` to `VITE_API_PROXY_TARGET` (default `http://localhost:5000`), so no CORS setup is needed.

## Screens

| Zone (PED §10.1) | Route | Screen | Requirements |
|---|---|---|---|
| Public | `/sign-in`, `/register` | Sign in / Create account (one page, two tabs) | REQ-023, REQ-029, REQ-030 |
| Public | `/check-email`, `/verify-email` | Email confirmation | REQ-033, D13, CR-004 |
| Requester | `/requests` | My requests | REQ-004 to REQ-006 |
| Requester | `/requests/new` | Report a problem | REQ-001 to REQ-003, REQ-031, REQ-035 |
| All roles | `/requests/:id` | Requester detail, staff workspace, or read-only for management | REQ-004, REQ-009 to REQ-017, REQ-024 |
| Staff | `/worklist` | Worklist | REQ-007, REQ-008 |
| Management | `/oversight` | Service overview | REQ-018 to REQ-020, REQ-022 |
| Management | `/audit` | Audit trail | REQ-021 |
| Management | `/all-requests` | All requests (read-only) | REQ-019, REQ-022 |

## Structure

```
src/
  config/        env.js: the only reader of environment variables
  domain/        Pure business rules, no React or HTTP: lifecycle (State), validation and
                 sorting (Strategy), categories, derived facts, navigation. Unit-tested.
  services/      index.js (composition root), gateways, adapters, AppError, session,
    http/          axios facade
    mock/          demo database and demo API
    events/        event bus (Observer) and gateway decorator
  context/       AuthProvider
  hooks/         useAuth, useAsync, useEventBus, useNotifications, useSort
  routes/        ProtectedRoute
  components/    common/ (Button, Field, Banner, ...), layout/ (TopBar, shells), requests/
  pages/         auth/, requester/, staff/, management/
  utils/         format.js
```

Dependency direction: `pages → components / hooks → services → domain`. `domain/` imports nothing from the other folders.

## Changes from the M2 frontend baseline

The M2 prototype modelled "civic issues" (potholes, upvotes, roles resident/staff/admin, statuses reported/in_review/…). That did not match the PED, so M3 realigns the frontend with the approved baseline. Record these in the PED v3.0 controlled-changes section.

| M2 prototype | M3 | Reason |
|---|---|---|
| Issues with upvotes and public comments | Service requests with an action timeline | PED §8 data model; upvotes were never in scope |
| Roles resident / staff / admin | `user_type` requester / staff / management | PED §8.1 |
| Four ad-hoc statuses | Seven D10 statuses with enforced transitions | D10 |
| Sidebar layout | Top navigation built per role | Wireframes, PED §10 |
| Register signs the user straight in | Email confirmation before first sign-in | D13, CR-004 |
| `/api/issues`, `/api/auth/me` | PED §12.2 endpoints under `/api/v1`; session rebuilt from the JWT | D06, §12.4 |
| Two mock service files branching on a flag | One gateway per module over a swappable transport | Removes duplicated logic |
| No tests | 84 tests | M3 |

## Known limitations

- **Not integrated with the real API yet** (see above). Nothing here has been run against Express and PostgreSQL.
- **Target days per category are assumed.** PED approves the rule (S-IN-010) but not the numbers; `src/domain/categories.js` holds working values. If the API sends `target_date` it is used instead.
- **Who may reopen a completed request** is not stated in D10; staff only is assumed.
- **Category correction** is allowed only while a request is Pending (assumed; REQ-024 does not say).
- **Administrator screens** (staff accounts, categories) are not built: PED §10.6 defers them and §12.2 has no endpoints for them.
- **The JWT is kept in `localStorage`**, readable by any script on the page. Acceptable for M3; an httpOnly cookie is the stronger option and would change only `session.js` and `httpTransport.js`.
- **Accessibility** was built to the WCAG 2.2 AA criteria in PED §10.4 and checked by keyboard walkthrough and at 320 px and 390 px. It has not been through an automated axe/Lighthouse run or a screen-reader test.
- **No end-to-end test suite is committed.** The browser walkthrough used to check this build was scripted but lives outside the repository.
- Route-level role checks are a usability control only. The API must enforce every rule again (ASR-002).

## Environment variables

See `.env.example`. Every `VITE_` variable is compiled into the public bundle, so none may hold a secret.
