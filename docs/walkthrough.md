# AtomQuest Goal Setting Portal — Hackathon Walkthrough

Congratulations! The **AtomQuest In-House Goal Setting & Tracking Portal** is now completely built and running locally on your machine. This represents a massive engineering effort adhering strictly to Clean Architecture and Test-Driven Development (TDD). We have successfully implemented **both Phase 1 and Phase 2** of the project!

## 🏆 What Was Accomplished

We successfully transitioned from the planning phase to a fully functional application encompassing both a robust Express backend and a modern React frontend.

### 1. UI/UX Modernization & Refactoring (Completed!)
- **Design System & Primitives:** Standardized the UI elements across the entire portal by implementing a unified design system. We designed reusable components (`Button`, `Card`, `Badge`, `Input`, `Table`, `EmptyState`, `ProgressBar`, `LoadingSpinner`) inside `client/src/components/primitives/`.
- **Eye-Candy & Glassmorphism:** Applied dynamic backgrounds, glowing borders, smooth hover animations, and elegant gradients. Transformed standard cards into modern glassmorphic containers using backdrop-filters.
- **Page Refactoring:** Refactored all application pages:
  - `Login.jsx` now uses modern glassmorphism design, styled form inputs, and sleek SSO option cards.
  - `Dashboard.jsx` displays premium, responsive KPI cards with clean typography and layout.
  - `GoalSheet.jsx` and `ApprovalQueue.jsx` now pull the unified global `ProgressBar` instead of duplicate local components.
  - `Analytics.jsx` and `Reports.jsx` are fully refactored to use standard primitives, replacing legacy layout styles with robust layouts and highly engaging EmptyStates.
- **Responsive Layout & Spacing:** Improved page spacing, typography hierarchy, forms, responsive padding, and accessibility across all screen sizes.

### 2. Robust Backend Core
- **Data Layer:** Implemented an in-memory repository pattern (`userRepository`, `goalRepository`, `auditRepository`, etc.) that cleanly separates data access from business logic. We also seeded realistic demo data to ensure immediate testability.
- **TDD Business Logic:** Every core feature (Scoring, Validation, Audit Logging, Check-in Windows) was built test-first. We successfully ran the Jest test suite to prove correctness.
- **Secure APIs:** Built out the Express controllers and routes with centralized error handling, Joi validation, JWT authentication, and strict Role-Based Access Control (RBAC).

### 3. Role-Based UI Pages
We've built dedicated flows for every user role:
- **Login:** A beautiful entry point with error handling and demo account hints.
- **Dashboard:** A role-aware landing page displaying distinct KPI cards based on whether the user is an Employee, Manager, or Admin.
- **Goal Sheet (Employee):** Allows employees to view their goals, track their total weightage against the 100% requirement, and add new goals.
- **Check-in (Employee):** Enables employees to submit actuals against their targets during active performance windows.
- **Approval Queue (Manager):** Managers can review goal sheets submitted by their direct reports, approve and lock them, or return them with a reason.
- **Admin Panel (Admin):** HR can manage active cycle phases, unlock goals via the immutable audit trail, run the escalation engine, and download the compliance CSV reports.
- **Analytics (Admin):** Displays org-wide score distributions and manager effectiveness rankings.

## 🏃‍♀️ How to Test it Locally

The application is currently running on your machine! You can interact with it right now:

1. Open your browser and navigate to: [http://localhost:5173/](http://localhost:5173/)
2. Use one of the seeded demo accounts to log in:
   - **Employee:** `sarah.mehta@atomquest.com` (Pass: `Employee@123`)
   - **Manager:** `john.dsouza@atomquest.com` (Pass: `Manager@123`)
   - **Admin:** `maya.iyer@atomquest.com` (Pass: `Admin@123`)

*(Note: Ensure you type the credentials into the standard email/password fields rather than clicking the Microsoft SSO placeholder button!)*

## 🔮 Future Enhancements
The architecture is solid and designed for scale. Future enhancements could include:
1. **Database Migration:** Swap the `inMemoryStore.js` with a PostgreSQL implementation. Because we used the Repository pattern, the Services and Controllers will not require any changes!
2. **SSO Integration:** Wire up the MSAL.js library to the Microsoft Entra ID placeholder button on the login screen.
3. **WebSockets:** Add Socket.io for real-time notification alerts when goals are approved or returned.
