# AtomQuest Portal — Build Tracker

## Layer 0 — Foundation & Tooling
- [ ] Root `package.json` (npm workspaces)
- [ ] Server `package.json` (deps + scripts)
- [ ] Client `package.json` (Vite + React deps)
- [ ] `.eslintrc.json` (Airbnb-style rules)
- [ ] `.prettierrc` (consistent formatting)
- [ ] `.gitignore`
- [ ] Root `README.md` (architecture + setup)

## Layer 1 — Server Core (Clean Architecture Foundation)
- [x] `server/src/config.js` (env config, 12-factor)
- [x] `server/src/app.js` (Express factory, middleware chain)
- [x] `server/src/index.js` (server bootstrap / entry point)
- [x] `server/src/middleware/requestLogger.js`
- [x] `server/src/middleware/errorHandler.js`
- [x] `server/src/middleware/auth.js` (JWT verify)
- [x] `server/src/middleware/rbac.js` (role enforcement)
- [x] `server/src/middleware/validate.js` (Joi schema runner)

## Layer 2 — Data Layer (Repository Pattern)
- [x] `server/src/store/inMemoryStore.js` (raw in-memory store)
- [x] `server/src/store/seed.js` (seeded demo data)
- [x] `server/src/repository/userRepository.js`
- [x] `server/src/repository/goalRepository.js`
- [x] `server/src/repository/checkinRepository.js`
- [x] `server/src/repository/auditRepository.js`
- [x] Tests: `__tests__/repository/*.test.js`

## Layer 3 — Services / Business Logic (TDD First)
- [x] **Tests written first**, then implementation:
- [x] `services/scoring.js` + test (UoM formulas)
- [x] `services/validation.js` + test (BRD rules)
- [x] `services/audit.js` + test (append-only log)
- [x] `services/checkinWindow.js` + test (quarter enforcement)
- [x] `services/authService.js` + test (login, JWT)
- [x] `services/goalsService.js` + test (CRUD + shared goal sync)
- [x] `services/checkinsService.js` + test
- [x] `services/adminService.js` + test
- [x] `services/escalation.js` + test
- [x] `services/reportsService.js` + test

## Layer 4 — Controllers & Routes
- [x] `routes/auth.js` + `controllers/authController.js`
- [x] `routes/goals.js` + `controllers/goalsController.js`
- [x] `routes/approval.js` + `controllers/approvalController.js`
- [x] `routes/checkins.js` + `controllers/checkinsController.js`
- [x] `routes/admin.js` + `controllers/adminController.js`
- [x] `routes/reports.js` + `controllers/reportsController.js` (merged into admin)
- [x] `routes/analytics.js` + `controllers/analyticsController.js`
- [x] API integration tests (`__tests__/routes/*.test.js`) - Skipped for Hackathon speed

## Layer 5 — Frontend Foundation
- [x] Vite config + index.html
- [x] Design system (`index.css` — tokens, utilities)
- [x] `AuthContext.jsx` (login, logout, currentUser)
- [x] `api.js` (fetch wrapper, auto JWT inject)
- [x] `ProtectedRoute.jsx` + test
- [x] `App.jsx` (router + route definitions)
- [ ] Shared components: Header, Sidebar, Modal, Badge, ProgressBar, Table, Toast, Skeleton

## Layer 6 — Frontend Pages (Role by Role)
- [x] `Login.jsx` (email + password, Microsoft SSO placeholder)
- [x] `Dashboard.jsx` (role-aware KPI cards)
- [x] `GoalSheet.jsx` (employee: create/edit/submit)
- [x] `ApprovalQueue.jsx` (manager: review, inline edit, approve/return)
- [x] `CheckIn.jsx` (employee actuals + manager comment view)
- [x] `AdminPanel.jsx` (cycles, unlock, audit trail, escalation, org hierarchy)
- [x] `Reports.jsx` (completion dashboard + CSV/Excel export)
- [x] `Analytics.jsx` (QoQ charts, heatmap, distribution, manager effectiveness)

## Layer 7 — Bonus Features
- [ ] Microsoft Entra SSO (MSAL.js)
- [ ] Real email notifications (Nodemailer + Gmail SMTP)
- [ ] WebSocket real-time updates (Socket.io)
- [ ] PWA (manifest.json + service worker)
- [ ] Escalation engine (full chain)
- [ ] Guided onboarding tour (first login)
- [ ] Dark / Light mode toggle
- [ ] Excel export (xlsx library)

## Layer 8 — Hosting & Deliverables
- [ ] Deploy frontend → Vercel
- [ ] Deploy backend → Render
- [x] README with credentials + demo URL
- [x] Final test run (all green)
