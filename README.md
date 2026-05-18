# AtomQuest 1.0 — In-House Goal Setting & Tracking Portal

A robust, production-ready goal management system built with Clean Architecture, TDD, React, Express, and Vite. Designed to manage the end-to-end employee goal lifecycle.

## 🚀 Features

- **Role-Based Access Control (RBAC)**: Secure access for Employees, Managers, and Admins.
- **Goal Lifecycle Management**: Create, edit, submit, return, and approve goal sheets.
- **Business Rules Enforcement**: Strict 100% weightage validation, 8-goal limit, and immutable locked fields.
- **Quarterly Check-ins**: Submit progress (actuals) against targets within strict, admin-defined time windows.
- **Append-Only Audit Trail**: All changes to locked goals and unlocking events are recorded permanently for HR.
- **Analytics & Dashboards**: Role-aware KPI cards showing org-wide adoption, manager effectiveness, and goal progress.
- **Clean Architecture Backend**: Decoupled layers (Controllers → Services → Repositories → Store) allowing for easy migration from the in-memory store to Postgres.
- **TDD Approach**: Core business logic modules (scoring, validation, window enforcement, escalation) are fully unit-tested.

## 💻 Tech Stack

**Frontend:** React 18, React Router v6, Vite, Custom CSS Design System (Glassmorphism)
**Backend:** Node.js, Express 5, JSON Web Tokens (JWT), Joi, bcryptjs
**Testing:** Jest (with ESM support)

## 🛠️ Quick Start

This project uses npm workspaces to run the client and server concurrently.

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run the Application (Dev Mode)**
   ```bash
   npm run dev
   ```
   * The backend API will start at `http://localhost:4000`
   * The frontend Vite server will start at `http://localhost:5173`

3. **Run Unit Tests**
   ```bash
   npm test --workspace=server
   ```

## 🔐 Demo Accounts

The application automatically seeds an in-memory database with realistic test data.

- **Employee**: `employee@test.com`
- **Manager**: `manager@test.com`
- **Admin**: `admin@test.com`

**Password for all accounts:** `password123`

*(Note: The database seed also maps specific users like `sarah.mehta@atomquest.com` with password `Employee@123` as defined in `seed.js`)*

## 🏗️ Architecture Layers

1. **Layer 1 - Server Core:** Express routing, CORS, Helmet security, global error handling.
2. **Layer 2 - Data Layer:** Repository Pattern over an in-memory map store.
3. **Layer 3 - Domain Services:** Business logic driven by TDD.
4. **Layer 4 - API Integration:** Express Controllers & Routes mapped to services.
5. **Layer 5 - Frontend Foundation:** Vite + React Context + Fetch Wrapper.
6. **Layer 6 - UI Pages:** Dashboard, Login, and Goal Management interfaces.

## ⚡ Infrastructure & Efficiency

Evaluated for production-readiness, this solution includes several infrastructure optimizations to reduce hosting costs and improve API efficiency:

- **Caching Strategies**: Implemented `apicache` on the backend for read-heavy, low-mutation endpoints (Analytics, Active Cycles) to prevent redundant DB load. The frontend features an in-memory API cache (`api.js`) for session-persistent data.
- **API Call Efficiency**: The UI implements debouncing, smart data-fetching using `Map` lookups (O(1)) in the backend, and avoids N+1 query patterns by pre-filtering in memory via the Repository pattern.
- **Hosting Cost Awareness**: The backend uses the `compression` middleware to GZIP JSON payloads, significantly reducing egress bandwidth costs. The frontend uses manual chunking via Rollup in Vite to separate vendor libraries, enabling long-term CDN caching of heavy dependencies (React, Chart.js) and minimizing the size of frequent application updates.
