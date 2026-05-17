# AtomQuest Hackathon 1.0 — Goal Setting & Tracking Portal

## Overview

Full-stack web portal covering the complete employee goal lifecycle: **Login (email RBAC) → Goal Creation → Manager Approval → Quarterly Check-ins → Admin Governance → Reports & Analytics.**

Architecture follows **Clean Architecture** principles (Uncle Bob) — strict layer separation (routes → controllers → services → repository), centralized auth middleware, and input validation at the boundary. Frontend uses a component-driven design with protected role-based routing.

---

## Architecture

```
┌─────────────────────────────────────┐
│        React + Vite  (port 5173)    │
│  Login → Role Router → Protected    │
│  Pages (Employee / Manager / Admin) │
└──────────────┬──────────────────────┘
               │  REST API (JSON + JWT Bearer)
               ▼
┌─────────────────────────────────────┐
│    Node.js + Express  (port 4000)   │
│                                     │
│  routes/ → controllers/ →           │
│  services/ → repository/            │
│                                     │
│  Middleware: auth, rbac, validate,  │
│  errorHandler, requestLogger        │
└──────────────┬──────────────────────┘
               │
               ▼
      In-memory seeded store
   (repository pattern — swap to
    PostgreSQL with zero service changes)
```

**Tech Stack:**
- **Frontend:** React 18, Vite 5, Vanilla CSS, Chart.js
- **Backend:** Node.js 20, Express 5, `jsonwebtoken`, `joi` (validation)
- **Auth:** JWT (HS256) — email-based login, role from seeded mapping
- **Data:** In-memory repository (repository pattern — DB-agnostic)
- **Export:** CSV string generation (no 3rd-party library)

---

## RBAC — Email-to-Role Mapping

Login requires **email + password**. Role is determined server-side from the seeded user registry. JWT is issued and stored in `localStorage`. All API calls send `Authorization: Bearer <token>`. Middleware verifies token and enforces role before reaching controllers.

| Email | Password | Role |
|-------|----------|------|
| `sarah.mehta@atomquest.com` | `Employee@123` | `employee` |
| `john.dsouza@atomquest.com` | `Manager@123` | `manager` |
| `maya.iyer@atomquest.com` | `Admin@123` | `admin` |

---

## Good Practices Applied

| Principle | Application |
|-----------|-------------|
| **Clean Architecture** | routes → controllers → services → repository. No business logic in routes. |
| **Single Responsibility** | Each service file owns exactly one domain (goals, checkins, audit, scoring, escalation). |
| **Fail Fast / Guard Clauses** | `joi` validation middleware rejects malformed requests before controllers run. |
| **12-Factor App** | Config in `server/config.js` (env vars with defaults). No hardcoded secrets. |
| **Middleware Chain** | `requestLogger → auth → rbac(role) → validate(schema) → controller` |
| **Repository Pattern** | All data access through `repository/` — services never touch the raw store directly. |
| **Consistent Error Shape** | `{ success: false, error: { code, message } }` from centralized `errorHandler`. |
| **Immutable Audit Trail** | Every post-lock mutation appends to audit log (never overwrites). |
| **Protected Routes (FE)** | `<ProtectedRoute allowedRoles={[]} />` wrapper — redirects to login on invalid role/token. |
| **Component Isolation** | Shared UI components (`Modal`, `Badge`, `Table`, `ProgressBar`) are role-agnostic. |

---

## File Structure

```
AtomQuest--HACK/
├── package.json                    (root workspaces: client + server)
│
├── client/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js              (proxy /api → :4000)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                 (router + auth context)
│       ├── index.css               (design system tokens + utilities)
│       ├── api.js                  (all fetch calls, auto-attach JWT)
│       ├── context/
│       │   └── AuthContext.jsx     (login, logout, currentUser state)
│       ├── components/
│       │   ├── ProtectedRoute.jsx  (role-based route guard)
│       │   ├── Header.jsx          (user info, logout)
│       │   ├── Sidebar.jsx         (role-aware nav links)
│       │   ├── Modal.jsx
│       │   ├── Badge.jsx           (status chips)
│       │   ├── ProgressBar.jsx
│       │   └── Table.jsx           (sortable, reusable)
│       └── pages/
│           ├── Login.jsx           (email + password form)
│           ├── Dashboard.jsx       (role-aware home with KPI cards)
│           ├── GoalSheet.jsx       (employee: create / edit / submit)
│           ├── ApprovalQueue.jsx   (manager: review, inline edit, approve/return)
│           ├── CheckIn.jsx         (employee actuals + manager comment view)
│           ├── AdminPanel.jsx      (cycles, unlock, audit trail, escalation log)
│           ├── Reports.jsx         (completion dashboard + CSV export)
│           └── Analytics.jsx       (QoQ charts, heatmap, distribution)
│
└── server/
    ├── package.json
    ├── index.js                    (Express app bootstrap)
    ├── config.js                   (env vars with sane defaults)
    ├── middleware/
    │   ├── auth.js                 (JWT verify → req.user)
    │   ├── rbac.js                 (role whitelist enforcement)
    │   ├── validate.js             (joi schema runner)
    │   ├── requestLogger.js        (structured request logs)
    │   └── errorHandler.js         (global error → consistent JSON shape)
    ├── routes/
    │   ├── auth.js                 (POST /api/auth/login, POST /api/auth/logout)
    │   ├── goals.js
    │   ├── checkins.js
    │   ├── admin.js
    │   ├── reports.js
    │   └── analytics.js
    ├── controllers/
    │   ├── authController.js
    │   ├── goalsController.js
    │   ├── checkinsController.js
    │   ├── adminController.js
    │   ├── reportsController.js
    │   └── analyticsController.js
    ├── services/
    │   ├── authService.js          (verify credentials, issue JWT)
    │   ├── goalsService.js         (CRUD + validation + shared goal logic)
    │   ├── checkinsService.js      (actuals, status, score computation)
    │   ├── adminService.js         (cycle management, unlock, escalation)
    │   ├── reportsService.js       (completion dashboard, CSV export)
    │   ├── analyticsService.js     (QoQ trends, heatmap data)
    │   ├── scoring.js              (UoM formula engine)
    │   ├── validation.js           (goal sheet business rules)
    │   ├── audit.js                (append-only audit log)
    │   └── escalation.js          (rule-based escalation engine)
    ├── repository/
    │   ├── userRepository.js
    │   ├── goalRepository.js
    │   ├── checkinRepository.js
    │   └── auditRepository.js
    └── store/
        └── seed.js                 (in-memory store + seeded demo data)
```

---

## Phase 1 — Authentication & RBAC

### Backend
- `POST /api/auth/login` — validates email + password, returns `{ token, user: { id, name, email, role } }`
- `POST /api/auth/logout` — client-side token drop (stateless JWT)
- `auth.js` middleware: extracts Bearer token, verifies signature, attaches `req.user`
- `rbac.js` middleware: `rbac('manager', 'admin')` — throws 403 if role not in list

### Frontend
- `AuthContext` provides `login()`, `logout()`, `currentUser` globally
- `ProtectedRoute` wraps every page — redirects to `/login` if no valid token or wrong role
- `api.js` auto-injects `Authorization: Bearer <token>` on every request

---

## Phase 2 — Goal Creation & Approval (BRD 2.1)

### Routes
| Method | Path | Role | Action |
|--------|------|------|--------|
| GET | `/api/goals` | employee, manager, admin | List goals (scoped by role) |
| POST | `/api/goals` | employee | Create goal |
| PUT | `/api/goals/:id` | employee (pre-submit), manager (approval), admin (unlock) | Edit goal |
| DELETE | `/api/goals/:id` | employee (pre-submit) | Delete goal |
| POST | `/api/goals/:id/submit` | employee | Submit for approval |
| POST | `/api/goals/shared` | manager, admin | Push shared goal |
| GET | `/api/approval/queue` | manager | Pending submissions |
| PUT | `/api/approval/:sheetId/approve` | manager | Lock and approve |
| PUT | `/api/approval/:sheetId/return` | manager | Return for rework |

### Validation (joi schemas + business rules)
- Total weightage = 100% (checked in service, not just route)
- Min weightage per goal ≥ 10%
- Max 8 goals per employee
- Shared goals: weightage editable, title/target read-only

---

## Phase 3 — Achievement & Check-ins (BRD 2.2)

### Scoring Engine (`services/scoring.js`)
| UoM | Formula |
|-----|---------|
| Min (higher is better) | `achievement / target * 100` |
| Max (lower is better) | `target / achievement * 100` |
| Timeline | `completionDate <= deadline ? 100 : 0` |
| Zero | `achievement === 0 ? 100 : 0` |

### Routes
| Method | Path | Role | Action |
|--------|------|------|--------|
| GET | `/api/checkins` | all | Get check-ins (scoped) |
| POST | `/api/checkins` | employee | Submit actuals |
| PUT | `/api/checkins/:id` | employee | Update actuals (within window) |
| POST | `/api/checkins/:id/comment` | manager | Add check-in comment |

### Quarter Window Enforcement
Active quarter computed from current date — server-side. Submissions outside window return `403 WINDOW_CLOSED`.

---

## Phase 4 — Admin, Reports & Governance (BRD 4)

### AdminPanel
- Cycle management: open/close phases
- Goal unlock (reason logged to audit trail)
- Audit trail table: filterable by user/date
- Escalation log with status

### Reports
- Completion dashboard: employee + manager completion per quarter
- CSV export: `Planned Target vs Actual Achievement` for all employees

### Audit (`services/audit.js` + `repository/auditRepository.js`)
- Append-only. Every mutation after lock: `{ userId, goalId, action, field, oldVal, newVal, timestamp }`
- Never mutated or deleted

---

## Phase 5 — Bonus Features

### Escalation Module
- Rules: N days since cycle open without submission → escalate
- Escalation chain: employee → manager → HR
- Visible in AdminPanel escalation log

### Analytics
- QoQ achievement trend (Chart.js line chart)
- Completion rate heatmap (CSS grid, color-coded)
- Goal distribution by Thrust Area (pie chart)
- Manager effectiveness table

### Notification Log (Teams/Email simulated)
- Events: submitted, approved, rejected, check-in reminder
- Displayed in AdminPanel as a notification feed

---

## Design System

- **Background:** Deep navy `#0A0F1E`
- **Accent:** Electric indigo `#6366F1`
- **Success:** Emerald `#10B981`
- **Warning:** Amber `#F59E0B`
- **Danger:** Rose `#F43F5E`
- **Font:** Inter (Google Fonts)
- **Cards:** Glassmorphism (`backdrop-filter: blur`)
- **Animations:** 200ms ease transitions, hover lifts, progress bar fills
- **Responsive:** Sidebar collapses on mobile

---

## Demo Seed Data

**Users (for login):**

| Name | Email | Password | Role | Reports To |
|------|-------|----------|------|------------|
| Sarah Mehta | sarah.mehta@atomquest.com | Employee@123 | Employee | John D'Souza |
| Raj Patel | raj.patel@atomquest.com | Employee@123 | Employee | John D'Souza |
| John D'Souza | john.dsouza@atomquest.com | Manager@123 | Manager | Maya Iyer |
| Maya Iyer | maya.iyer@atomquest.com | Admin@123 | Admin/HR | — |

**Pre-seeded state:**
- Sarah: 3 goals (1 approved+locked, 1 submitted awaiting approval, 1 draft)
- Raj: 2 goals (1 draft)
- Q1 check-in data for Sarah's locked goal
- 2 audit trail entries (post-lock edits by Maya)
- 1 shared goal pushed by John to both Sarah and Raj
- 1 escalation entry (Raj missed submission deadline)

---

## Verification Plan

1. Login as `sarah.mehta@atomquest.com` → create goal → trigger validation errors → submit
2. Login as `john.dsouza@atomquest.com` → approve Sarah's goal → verify lock
3. Re-login as Sarah → enter Q1 actuals → verify score computed
4. Re-login as John → add check-in comment → verify in Sarah's view
5. Login as `maya.iyer@atomquest.com` → view audit trail → export CSV → view analytics charts
6. Attempt to access `/admin` as Sarah → verify redirect to login
