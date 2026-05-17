# Project Handoff Notes: AtomQuest Goal Setting Portal

## 🎯 Project Objective
Build a production-ready **In-House Goal Setting & Tracking Portal** for the AtomQuest Hackathon 1.0. 
- **Focus**: Clean Architecture, TDD, Premium UI/UX, and strict business rule enforcement.
- **Mandatory Rules**: 100% weightage check, max 8 goals, immutable locked goals, quarterly check-in windows.

---

## 🏗️ Technical Architecture
- **Monorepo Structure**: Uses npm workspaces (`/server` and `/client`).
- **Backend (Node/Express)**: 
  - **Clean Architecture**: `Store` -> `Repository` -> `Services` -> `Controllers` -> `Routes`.
  - **Auth**: JWT-based with RBAC middleware (Employee, Manager, Admin).
  - **Validation**: Joi schemas for all inputs.
  - **Data**: In-memory Map-based store (`inMemoryStore.js`).
- **Frontend (React/Vite)**:
  - **Styling**: Vanilla CSS Design System (`index.css`) with glassmorphism and modern tokens.
  - **State**: `AuthContext` for user session.
  - **API**: Centralized `api.js` fetch wrapper with JWT injection.

---

## 📍 Current Status

### ✅ Backend (100% Complete)
- All services (`Goals`, `Checkins`, `Admin`, `Scoring`, `Validation`, `Audit`, `Escalation`, `Reports`) are implemented.
- **TDD**: Tests written for all services in `server/__tests__/services/`.
- **Seeding**: The server now calls `seedStore()` automatically on startup in `server/src/index.js`.

### 🏗️ Frontend (90% Complete)
- **Foundation**: Routing, Auth context, Protected Routes, and Layout are done.
- **Pages Implemented**:
  - `Login.jsx`: Functional with demo credential hints.
  - `Dashboard.jsx`: Role-aware KPI cards.
  - `GoalSheet.jsx`: Employee goal management (CRUD + Submit).
  - `ApprovalQueue.jsx`: Manager review and approve/return flow.
  - `CheckIn.jsx`: Employee quarterly progress submission.
  - `AdminPanel.jsx`: Cycle management, unlocks, and CSV report downloads.
  - `Analytics.jsx`: Score distribution and manager effectiveness charts.

---

## 🔑 Demo Credentials (Seeded)
**Password for all**: `Employee@123` (or `Manager@123` / `Admin@123` respectively)
- **Employee**: `sarah.mehta@atomquest.com`
- **Employee**: `raj.patel@atomquest.com`
- **Manager**: `john.dsouza@atomquest.com`
- **Admin**: `maya.iyer@atomquest.com`

---

## ⚠️ Known Issues & Important Context
1. **Jest ESM Hoisting**: Unit tests that use `jest.mock()` on ESM modules may fail until mocks are refactored. Use `server/__tests__/integration/approvalFlow.test.js` as the reference for integration-style tests against the real store.
2. **Database Seeding**: `await seedStore()` runs before `server.listen` in `index.js` — restart the server to reset demo data.
3. **SSO Button**: The "Microsoft SSO" button on the login page is a visual placeholder; use email/password for testing.

---

## ✅ E2E Verification (May 2026)

Full flow verified via `scripts/e2e-flow.mjs` and manual UI paths:

| Step | Actor | Result |
|------|-------|--------|
| Submit goal sheet | Raj (`raj.patel@atomquest.com`) | ✅ 100% weightage sheet submits |
| Approval queue | John (`john.dsouza@atomquest.com`) | ✅ Fixed — was crashing on `findGoalsBySheetId.store` |
| Approve & lock | John | ✅ Sheet → `approved`, goals locked |
| Q1 check-in | Raj | ✅ Actuals saved with computed scores |
| CSV report | Maya (`maya.iyer@atomquest.com`) | ✅ Raj rows appear with scores (e.g. 80, 100) |

### Fixes applied in this pass
- **`approvalService`**: Replaced broken store access in pending approvals; added `GET /approval/:sheetId` for real goal data in the UI.
- **`ApprovalQueue.jsx`**: Loads actual goals from the API instead of hardcoded placeholders.
- **`Dashboard.jsx`**: Recent Activity from `GET /audit/recent`.
- **`CheckIn.jsx`**: Success state after submission.

---

## ⏭️ Optional Next Steps
1. Wire Dashboard KPI cards to live API summaries (currently role hints, not live counts).
2. Fix remaining Jest ESM mock hoisting across `__tests__/services/*.test.js`.
3. Admin "Force Unlock" form → connect to `POST /admin/goals/:goalId/unlock`.

---

## 📂 Relevant Files
- **Task Tracker**: [task.md](file:///C:/Users/Varshitha%20Sri%20Sai/.gemini/antigravity/brain/922c5f66-47fd-4fed-9fe5-9b63779192b0/task.md)
- **Implementation Plan**: [implementation_plan.md](file:///C:/Users/Varshitha%20Sri%20Sai/.gemini/antigravity/brain/922c5f66-47fd-4fed-9fe5-9b63779192b0/implementation_plan.md)
- **Detailed Walkthrough**: [walkthrough.md](file:///C:/Users/Varshitha%20Sri%20Sai/.gemini/antigravity/brain/922c5f66-47fd-4fed-9fe5-9b63779192b0/walkthrough.md)
