# CivicConnect — Frontend

React frontend for CivicConnect, a community civic-issue reporting and
tracking platform. This is the frontend tier of the PERN stack
(PostgreSQL, Express, React, Node.js) selected in PED v2.0 §5.5.

## Current implementation status (M2)

This is the **initial design baseline** for the frontend, not a finished
application. It is built against an assumed backend contract (see
`src/services/`) so backend development can proceed in parallel. What's
implemented:

- Application shell: public pages (landing, login, register) and an
  authenticated sidebar dashboard shell.
- Auth flow: register, login, session persistence, and route guarding by
  role (`resident`, `staff`, `admin`), via `AuthContext` + `ProtectedRoute`.
- Core domain flow: browse issues, filter by status, report a new issue,
  view an issue's detail with comments and upvoting, and a staff/admin
  triage dashboard grouped by status queue.
- A single, documented API boundary (`src/services/apiClient.js`) so the
  whole app talks to the Express API through one configurable client.

**Not yet implemented / deferred** (see Forward Engineering
Considerations in the PED): pagination controls beyond page size,
image/attachment upload on reports, notifications, and map-based issue
display. These are recorded as deferred decisions, not missing work.

## Prerequisites

- Node.js 20+ and npm 10+
- The CivicConnect Express API running locally — **not required yet**, see
  Mock mode below.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` if your backend runs somewhere other than
`http://localhost:5000`.

## Mock mode — running without a backend

Until the Express/PostgreSQL backend exists, the app runs fully in the
browser against seeded, localStorage-backed data. This is controlled by
one flag:

```
VITE_USE_MOCK_API=true   # in .env
```

With this set, `npm run dev` gives you a completely clickable app —
register or log in with a demo account (shown on the login page),
report an issue, browse/filter issues, comment, upvote, and (as
`staff`/`admin`) move issues through status queues. A banner at the top
of the app makes it clear when you're in mock mode, with a **Reset demo
data** link to restore the seed dataset.

Demo accounts (also listed in `src/services/mock/mockStore.js`):

| Email                  | Password      | Role     |
|-------------------------|--------------|----------|
| resident@example.com   | password123   | resident |
| staff@example.com      | password123   | staff    |
| admin@example.com      | password123   | admin    |

**Switching to the real backend:** once Express is ready, set
`VITE_USE_MOCK_API=false` in `.env` — no other code changes needed.
`authService.js` and `issueService.js` are the only files that branch on
this flag; every page and component calls them the same way regardless.
When you're confident the real backend is final, the `src/services/mock/`
folder and the `USE_MOCK` branches can be deleted entirely.

## Running locally

```bash
npm run dev
```

The dev server runs at `http://localhost:5173`. Requests to `/api/*` are
proxied to the Express backend (configured via `VITE_API_PROXY_TARGET`
in `vite.config.js`), so components can call relative paths like
`apiClient.get('/issues')` without CORS configuration in development.

## Building for production

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## Project structure

```
src/
  components/
    common/     Generic UI primitives (Button, FormField, ErrorBanner,
                DemoModeBanner, ...)
    layout/     App shells (PublicShell, AppShell, Sidebar)
    issues/     Domain components for the Issue aggregate (IssueCard,
                StatusBadge, CommentThread)
  context/      AuthContext — session state shared across the app
  hooks/        useAuth, useAsync (shared data-fetching helper)
  pages/        One file per route (Landing, Login, Dashboard, IssueList,
                IssueDetail, ReportIssue, AdminDashboard, NotFound)
  routes/       ProtectedRoute — auth/role route guarding
  services/     apiClient.js (the ONLY place axios is configured),
                authService.js, issueService.js — the documented API
                contract this frontend expects from Express
    mock/       Mock implementations used when VITE_USE_MOCK_API=true
                (mockStore.js, mockAuthService.js, mockIssueService.js) —
                delete this folder once the real backend is in use
  index.css     Design tokens (Tailwind v4 @theme) and global styles
```

This structure maps directly to the layered/component architecture
recorded in the PED: `pages` are the presentation layer, `components`
are reusable UI, `services` are the integration boundary to the
Express API, and `context`/`hooks` hold cross-cutting application
state. See `ADR-002` (frontend architecture) and `ADR-004`
(API client boundary) in the PED for the reasoning behind this split.

## Expected backend API contract

The frontend does not hit any hardcoded backend detail outside of
`src/services/`. Two files describe every endpoint currently expected:

- `src/services/authService.js` — `/api/auth/register`, `/api/auth/login`,
  `/api/auth/me`
- `src/services/issueService.js` — `/api/issues` (list/create),
  `/api/issues/:id` (detail), `/api/issues/:id/status` (staff-only
  update), `/api/issues/:id/comments`, `/api/issues/:id/upvote`

If the backend team finalises a different response shape, only these
two files need to change — no page or component talks to axios
directly (enforced by the API Client Boundary ADR).

## Design decisions applied here (see PED Decision Log)

- **Design pattern 1 — Facade over HTTP client**: `apiClient.js` wraps
  axios so auth headers, base URL, and error normalisation live in one
  place instead of being repeated in every component.
- **Design pattern 2 — Provider/Context for session state**:
  `AuthContext` avoids prop-drilling the current user through every
  page and centralises login/logout/session-rehydration logic.

## Environment variables

| Variable                  | Purpose                                             |
|----------------------------|-----------------------------------------------------|
| `VITE_API_BASE_URL`        | Base path the frontend calls (default `/api`)       |
| `VITE_API_PROXY_TARGET`    | Where the Vite dev server proxies `/api/*` to        |

No secrets are stored in this repository. `.env` is git-ignored;
`.env.example` documents the required variables.

## Known limitations / TODOs

- No automated tests yet (a Vitest + React Testing Library setup is the
  planned next step, tracked as a forward engineering consideration).
- Assumes JWT auth in a `Bearer` header; if the backend uses
  cookie-based sessions instead, only `apiClient.js` needs to change.
- Role-based UI (`staff`/`admin` views) trusts the `role` field
  returned by the backend; the backend remains the authority and must
  enforce role checks server-side regardless of what the UI hides.
