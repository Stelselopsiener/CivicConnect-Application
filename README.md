# CivicConnect

A web platform for submitting, managing, tracking and reporting on community service requests (facility faults, equipment damage, security concerns, IT support, maintenance, lost property and other requests). It replaces a mix of email, phone calls, WhatsApp messages, spreadsheets and paper with one controlled, auditable record per request.

Built by Team CivicConnect (Benno Weideman, Mohau Drew Modiselle, Tammy Fourie) for SEN381 Software Engineering, Belgium Campus ITversity, 2026.

| Where to look | |
|---|---|
| Engineering record (PED) | [`docs/PED v1.0/`](docs/PED v1.0/) (Milestone 1) · [`docs/PED v2.0/`](docs/PED v2.0/) (Milestone 2) |
| Architecture | PED §7 · D09 (layered modular monolith) · D10 (request state model) |
| Technology stack | PED §9 · D05 (PostgreSQL 16, Express 4, React 18, Node.js 20) |
| API contract | PED §12 · D06 (REST/JSON under `/api/v1`) |
| Design decisions | PED §11 · D11 (notifications) · D12 (status changes) · D13 (email confirmation at registration) |
| Wireframes | PED §10 · [`docs/PED v2.0/wireframes/index.html`](docs/PED v2.0/wireframes/) (clickable; open in a browser) |
| Team rules | [`GOVERNANCE.md`](GOVERNANCE.md) · PED §19–§20 |

---

## 1. What the system does

| Role | Can do |
|---|---|
| Requester | Register with email and password and confirm the email address, submit a request in a controlled category, see its status and timeline, see feedback, view past requests, cancel while still Pending |
| Staff / triage | See requests for their category, search/filter/sort, accept or assign ownership, move a request through valid status transitions, record actions, correct the category, resolve or close |
| Supervisor / management | See open, overdue, resolved and closed counts, filter by category, status and date, read the audit trail of staff actions |
| Administrator | Create staff and management accounts and set staff categories |

Out of scope (PED §3.3): WhatsApp/phone/email intake, native mobile apps, multiple languages, payments, AI triage, BI exports, external HR/asset integration, multi-tenant use. SMS notifications, SLA escalation and photo upload are deferred (PED §3.4).

## 2. Current implementation status (Milestone 2)

Milestone 2 is the **architecture, technology and initial design baseline**. Most of this repository is documentation; application code starts in the `program/` folder.

| Area | Status | Evidence |
|---|---|---|
| Requirements, scope, risks, RTM, decision log (M1) | Done | `docs/PED v1.0/` |
| Architecture, design decisions, wireframes (M2) | Done, in PED v2.0 | `docs/PED v2.0/` · PED §7, §10, §11 |
| Backend configuration template | Done | `program/backend/.env.example` |
| Backend bootstrap (Express app, `package.json`, database connection) | Not yet in the repository | Planned for M3 |
| Database schema: user, service_request, action, logging | Designed | PED §8 |
| Registration with email confirmation | Designed (CR-004) | PED §11.3 |
| Frontend (React) | Not started | Wireframes only |
| CI (lint, tests, build on pull request) | Planned | PED §13.1 |

## 3. Architecture in one paragraph

One React single-page app talks to one Express API over HTTPS/JSON (`/api/v1`); the API uses one PostgreSQL database and an SMTP email provider. Inside the API, code is grouped by business module (User, Request, Staff, Admin, Notification), and each module is split into layers: routes/controllers → application services → domain → infrastructure. Users register with email and password (bcrypt), confirm their email once through an emailed link, and then sign in with email and password to receive a signed JWT. Diagrams: PED §7 and §11.

## 4. Prerequisites

| Tool | Version (PED §9.3) | Check with |
|---|---|---|
| Node.js | 20.x LTS | `node -v` |
| npm | 10.x | `npm -v` |
| PostgreSQL | 16.x | `psql --version` |
| Git | any recent version | `git --version` |
| Editor | VS Code (team standard) | |

On Windows, install PostgreSQL with the official installer and tick "Command Line Tools", or use pgAdmin for the database step below.

## 5. Setup

### 5.1 Get the code

```bash
git clone https://github.com/Stelselopsiener/CivicConnect-Application.git
cd CivicConnect-Application
```

### 5.2 Create the database

```bash
psql -U postgres -c "CREATE DATABASE civicconnect;"
```

### 5.3 Configure the backend

```bash
cd program/backend
cp .env.example .env        # Windows: copy .env.example .env
```

Open `.env` and fill in your own local values:

| Variable | Example | Purpose |
|---|---|---|
| `PORT` | `5000` | Port the API listens on |
| `DB_USER` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | *your local password* | PostgreSQL password |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `civicconnect` | Database created in 5.2 |
| `JWT_SECRET` | any long random string | Signs sign-in tokens |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | leave empty locally | Email for registration confirmation (a test inbox is used in development) |
| `APP_BASE_URL` | `http://localhost:5173` | Used to build the confirmation link |

**`.env` is never committed.** It is listed in `.gitignore`; only `.env.example` (no real values) is in the repository (GOVERNANCE.md "Secrets", PED CON-SEC-02).

## 6. Run

> The backend bootstrap is not merged yet (see section 2). These are the commands the team will use once `program/backend/package.json` exists; they will be confirmed in the bootstrap pull request.

```bash
cd program/backend
npm ci          # install exact versions from package-lock.json
npm run dev     # start the API on http://localhost:5000
```

To view the wireframes now, open `docs/milestone-2/wireframes/index.html` in any browser. Use the tabs to move between screens, **Phone 390px** for the mobile layout and **Markers on** for the design notes.

## 7. Repository structure

**Current (Milestone 2):**

```
CivicConnect-Application/
├── README.md
├── GOVERNANCE.md                     # branch, pull request and secrets rules
├── .gitignore                        # keeps .env and node_modules out of Git
├── assignments/
│   └── assignment 3/                 # Assignment research documents
├── docs/
│   ├── PED v1.0/                  # Engineering foundation and requirements baseline
│   │   ├── PED v1.docx
│   │   ├── Problem_Statement_And_Business_Value.docx
│   │   ├── Stakeholder_Analysis.docx
│   │   ├── Scope_Baseline.docx
│   │   ├── requirements-acceptance.docx
│   │   ├── Constraints.docx
│   │   ├── rtm.docx
│   │   ├── Risk_Registry.docx
│   │   ├── Forward_Engineering_Considerations.docx
│   │   ├── Engineering_Decision_Log.docx
│   │   └── ai-usage-register.docx
│   └── PED v2.0/                  # Architecture, technology and initial design baseline
│       ├── PED v2.docx               # §7 architecture, §10 wireframes, §11 design decisions, RTM, ADRs
│       └── wireframes/
│           └── index.html            # clickable wireframes: open in a browser
└── program/
    └── backend/
        └── .env.example              # configuration template (real .env is never committed)
```

**Target structure for M3** (PED §7.3, D09). One Express API and one React app, each with its own `package.json`. Folders are added as the code is written; each name below says what belongs there.

```
CivicConnect-Application/
├── .github/
│   ├── workflows/ci.yml              # on every PR: npm ci, lint, test, build (backend and frontend)
│   └── pull_request_template.md      # review checklist from GOVERNANCE.md
└── program/
    ├── backend/                      # Express 4 API on Node.js 20
    │   ├── package.json              # scripts: dev, start, test, lint, migrate, seed
    │   ├── package-lock.json         # committed; installs use npm ci
    │   ├── .env.example
    │   ├── eslint.config.js
    │   ├── src/
    │   │   ├── server.js             # starts the HTTP server (reads PORT)
    │   │   ├── app.js                # builds the Express app and wires modules together
    │   │   ├── config/
    │   │   │   └── env.js            # loads and checks .env values once
    │   │   ├── api/
    │   │   │   ├── routes/           # auth, requests, staff, admin: /api/v1/...
    │   │   │   └── middleware/       # authenticate (JWT), authorize (role), validate, errorHandler
    │   │   ├── modules/              # one folder per business module
    │   │   │   ├── user/             # register, verify email, login, roles
    │   │   │   ├── request/          # submit, history, status changes (D10, D12)
    │   │   │   ├── staff/            # worklist, assign / accept, category correction
    │   │   │   ├── admin/            # management overview and audit trail (read-only)
    │   │   │   └── notification/     # NotificationChannel + email channel (D11)
    │   │   │       └── (each module: controller.js, service.js, repository.js, domain/)
    │   │   ├── infrastructure/
    │   │   │   ├── db/               # pg.Pool and transaction helper
    │   │   │   └── mail/             # MailSender interface + Nodemailer adapter
    │   │   └── shared/
    │   │       ├── events/           # in-process event dispatcher (D12)
    │   │       └── errors/           # AppError classes → JSON error envelope (§12.4)
    │   ├── db/
    │   │   ├── migrations/           # 001_user.sql, 002_service_request.sql, 003_action.sql, 004_logging_triggers.sql
    │   │   └── seeds/                # categories and one confirmed account per role
    │   └── tests/
    │       ├── unit/                 # domain rules, e.g. every status transition
    │       └── integration/          # API + test database, e.g. status change writes an action row
    └── frontend/                     # React 18 app built with Vite
        ├── package.json              # scripts: dev, build, test, lint
        ├── package-lock.json
        ├── .env.example              # VITE_API_URL
        ├── index.html
        ├── vite.config.js
        └── src/
            ├── main.jsx              # entry point
            ├── App.jsx               # routes per role
            ├── api/client.js         # one fetch wrapper: base URL, JWT header, error envelope
            ├── auth/                 # AuthContext, ProtectedRoute (role check)
            ├── pages/
            │   ├── auth/             # Register, CheckEmail, SignIn
            │   ├── requester/        # SubmitRequest, MyRequests, RequestDetail
            │   ├── staff/            # Worklist, RequestWorkspace
            │   └── management/       # Overview, AuditTrail
            ├── components/           # StatusPill, Timeline, FormField, ErrorSummary …
            └── styles/
```

Rules that keep this structure meaningful (PED §7.3):
- Routes and controllers never contain SQL; only `repository.js` files and `infrastructure/db` talk to PostgreSQL.
- `domain/` code imports nothing from Express, `pg` or Nodemailer, so business rules can be unit tested on their own.
- Modules call each other only through their `service.js`, never through another module's repository.
- Secrets live only in `.env`; every setting the code reads is listed in `.env.example`.

## 8. How we work

See [`GOVERNANCE.md`](GOVERNANCE.md). In short:
- `main` is protected: branch, pull request and two approvals from the other team members, no self-approval.
- Never commit secrets (`.env`, passwords, keys).
- Record material AI assistance in the AI Usage Register (PED §21; M1 copy in `docs/milestone-1/ai-usage-register.docx`).

## 9. Contributors

| Name | Student no. |
|---|---|
| Benno Weideman (team leader) | 602904 |
| Mohau Drew Modiselle | 602295 |
| Tammy Fourie | 601264 |
