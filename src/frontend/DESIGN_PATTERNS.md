# Design patterns in the CivicConnect frontend

Where each pattern lives, why it is there, and how to show it in the running product.
Every file named below opens with a comment that names its pattern, so `grep -r "DESIGN PATTERN" src` lists them all.

| # | Pattern | File(s) | What it solves here | PED link |
|---|---|---|---|---|
| 1 | **State** | `src/domain/requestLifecycle.js` | Each of the seven statuses is an object that knows its own allowed moves, who may make them and whether a comment is required. Screens ask the state; no screen has an `if (status === …)` ladder. | D10, REQ-013, REQ-016, REQ-017 |
| 2 | **Strategy** (transport) | `src/services/http/httpTransport.js`, `src/services/mock/mockTransport.js`, chosen in `src/services/index.js` | Two interchangeable `{ get, post, patch }` implementations: the real API and the in-browser demo API. Gateways are written once and never know which one they received. | D06, D11 (same idea as `NotificationChannel`) |
| 3 | **Strategy** (rules and ordering) | `src/domain/validation.js`, `src/domain/sortStrategies.js`, `FEEDS` in `src/hooks/useNotifications.js` | Validation rules, sort orders and per-role notification feeds are small functions selected by key. Adding one never edits the code that runs them. | §12.3 layer 1, REQ-008 |
| 4 | **Abstract Factory / composition root** | `src/services/index.js` (`createServices`) | The single place that builds the family of gateways for the chosen transport and wires in the event bus. Tests call the same factory with their own bus. | D11 composition root |
| 5 | **Facade** | `src/services/http/httpTransport.js` | The only file that imports axios. Hides base URL (`/api/v1`), Bearer header, 10 s timeout, session expiry and error normalisation behind three calls. | ADR "API client boundary", §12.4 |
| 6 | **Adapter** | `src/services/adapters/requestAdapter.js`, `userAdapter.js`, `toAppError` in `src/services/AppError.js` | Converts the API's database-shaped JSON (`service_request_id`, `street_address`) and error envelope into the UI model (`reference`, `targetDate`, `isOverdue`, `AppError`). A renamed column is a one-file change. | §8.2, §12.2, §12.4 |
| 7 | **Gateway / Repository** | `src/services/requestGateway.js`, `authGateway.js` | Screens speak in domain terms (`listMine`, `changeStatus`) and never see a URL or HTTP verb. The endpoint list of §12.2 is in one file. | §12.2 |
| 8 | **Decorator** | `src/services/events/withRequestEvents.js` | Wraps any request gateway and publishes one event after a command succeeds. The gateway stays unaware of events. | D12 ("publish after COMMIT") |
| 9 | **Observer** (publish/subscribe) | `src/services/events/eventBus.js`, `src/hooks/useEventBus.js`; subscribers: `ToastHost.jsx`, `useNotifications.js`, `useAsync.js` (`refreshOn`), `AuthContext.jsx` | A command finishes, then anyone interested reacts. No screen calls "show toast" or "refresh the bell". A failing subscriber is logged and does not stop the others. | D12 |
| 10 | **Factory Method** | `src/domain/navigation.js` (`navigationFor(role)`) | Builds the menu for the signed-in `user_type`. Items a role cannot use are never created. | REQ-029, PED §10.1 |
| 11 | **Protection Proxy** | `src/routes/ProtectedRoute.jsx` | Stands in front of route groups: signed out → sign-in; wrong role → that role's own home. | REQ-029, ASR-002 |
| 12 | **Provider** (React Context) | `src/context/AuthContext.jsx`, `src/hooks/useAuth.js` | One owner of "who is signed in"; any component reads it without prop drilling. | ADR-002 |
| 13 | **Singleton** (module instance) | `eventBus` in `eventBus.js`, the axios client in `httpTransport.js` | One bus and one HTTP client for the whole app. | |

## How the patterns work together on one click

Staff press **Save as In Progress** in the request workspace:

1. `UpdateCard` (`pages/staff/RequestWorkspace.jsx`) only offered that option because the **State** object for "Accepted" allows it.
2. It calls `requestGateway.changeStatus(...)` (**Gateway**), obtained from the **composition root**.
3. The call first passes through the **Decorator**, then the gateway builds the §12.2 body and hands it to the **transport Strategy** (HTTP **Facade**, or the demo API).
4. The response goes through the **Adapter** and comes back as a UI request.
5. Only now does the Decorator publish `request.statusChanged` on the **Observer** bus.
6. Three subscribers react independently: the toast appears, the bell recounts, and any list with `refreshOn` reloads.

## Showing each pattern in the running app (demo mode)

| Pattern | What to do | What you see |
|---|---|---|
| State | Sign in as Pieter (staff), open a Pending request | "Completed" and "Closed" are listed but disabled with "Not allowed from Pending". The progress rail at the top is drawn from the same state objects. |
| State (requester side) | Sign in as Thandi, open CC-00128 | "Cancel request" is disabled with the reason; on a Pending request it is enabled. |
| Observer + Decorator | As staff, press "Accept myself" | Toast appears, bell count drops, and nothing in the workspace code asked for either. |
| Strategy (sorting) | Worklist: change "Order", or click a column header | Same table, different comparator. |
| Strategy (validation) | New request: press "Submit request" on an empty form | Error summary plus a message per field, each from one rule function. |
| Strategy (transport) + Abstract Factory | Set `VITE_USE_MOCK_API=false` and rebuild | The identical screens now call `/api/v1/...`; the demo banner disappears. |
| Adapter | Any list | `CC-00128`, the "Due" date and the "Overdue 5d" pill do not exist in the API data; the adapter derives them. |
| Factory Method + Protection Proxy | Sign in as each demo account; as Thandi, type `/worklist` in the address bar | Three different menus; the URL sends you back to "My requests". |
| Facade | Open `httpTransport.js` | `grep -r "from 'axios'" src` returns this one file. |

## Patterns deliberately not used

- **No global state library (Redux / Zustand).** Server data is fetched per screen with `useAsync`; only the session is shared, and Context covers that. Fewer moving parts for a three-person team.
- **No class hierarchy for gateways.** Factory functions plus a transport argument give the same substitution with less code.
- **No client-side cache.** The same reasoning as PED §12.3: stale data on the status path could offer a move the server will refuse.

## Tests that pin the patterns down

`npm test` runs 84 tests:

- `src/domain/requestLifecycle.test.js` — every valid transition, and a sweep proving every other (from, to, role) combination is refused.
- `src/domain/requestRules.test.js` — target date and overdue boundaries, sort strategies.
- `src/domain/validation.test.js` — rule strategies with boundary values.
- `src/services/__tests__/gateway.test.js` — gateway + adapter + decorator + event bus through the demo transport, including role scoping, 409 on an invalid transition, duplicate submission and email confirmation.

These run against the demo transport. They are evidence about the frontend's logic, not about the Express API.
