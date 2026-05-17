/**
 * @module inMemoryStore
 * @description The single source of truth for all application data.
 *
 * Architecture Decision: Why in-memory?
 *   For the hackathon demo, an in-memory store gives us:
 *   - Zero setup (no DB install, no migrations)
 *   - Instant reads/writes (no I/O latency)
 *   - Full control over data shape
 *
 *   The Repository Pattern ensures this module is the ONLY place that
 *   knows about the storage mechanism. Switching to PostgreSQL later
 *   requires changing only the repository files — zero changes to services.
 *
 * Data Modelling Principles (from "Designing Data-Intensive Applications", Kleppmann):
 *   - Each entity has a stable, globally unique ID (UUID v4)
 *   - Relationships use IDs, not embedded objects (normalised)
 *   - Audit fields: createdAt, updatedAt on every mutable entity
 *   - Immutable records (audit trail) are append-only
 *
 * IMPORTANT: This store is module-level state. In a multi-process deployment
 * (e.g., pm2 cluster mode) each process has its own copy. For production,
 * swap repositories to use a shared PostgreSQL or Redis store.
 *
 * @see {@link ./seed.js} for initial demo data population
 */

/**
 * The in-memory data store.
 * All collections are plain JavaScript Maps for O(1) ID-based lookups.
 *
 * @type {{
 *   users: Map<string, Object>,
 *   goals: Map<string, Object>,
 *   goalSheets: Map<string, Object>,
 *   sharedGoalLinks: Map<string, Object>,
 *   checkIns: Map<string, Object>,
 *   selfAssessments: Map<string, Object>,
 *   auditLog: Object[],
 *   notifications: Object[],
 *   escalationRules: Map<string, Object>,
 *   escalationLog: Object[],
 *   cycles: Map<string, Object>,
 *   orgHierarchy: Map<string, Object>
 * }}
 */
const store = {
  /**
   * Users — all portal users across all roles.
   * Key: userId (UUID)
   */
  users: new Map(),

  /**
   * Goals — individual goal definitions.
   * Key: goalId (UUID)
   * A goal belongs to exactly one goalSheet (via goalSheetId).
   */
  goals: new Map(),

  /**
   * GoalSheets — one per employee per cycle year.
   * A GoalSheet is the container that gets submitted for approval.
   * Key: goalSheetId (UUID)
   */
  goalSheets: new Map(),

  /**
   * SharedGoalLinks — links a shared/departmental goal to recipient employees.
   * When the primary owner updates achievements, this link enables sync.
   * Key: linkId (UUID)
   */
  sharedGoalLinks: new Map(),

  /**
   * CheckIns — quarterly achievement entries per employee per quarter.
   * Key: checkInId (UUID)
   * Contains an array of `entries` (one per goal).
   */
  checkIns: new Map(),

  /**
   * SelfAssessments — employee self-ratings before manager check-in.
   * Key: assessmentId (UUID)
   */
  selfAssessments: new Map(),

  /**
   * AuditLog — append-only log of all post-lock goal mutations.
   * This is an Array, not a Map, because entries are never looked up by ID
   * directly — they are always filtered/sorted by userId, goalId, or date.
   *
   * DDIA Ch. 11: "An append-only log is the most natural way to represent
   * a sequence of events — it gives you an audit trail for free."
   */
  auditLog: [],

  /**
   * Notifications — simulated email/Teams notifications log.
   * Append-only. Visible to Admin in the notification feed.
   */
  notifications: [],

  /**
   * EscalationRules — configurable rules that trigger escalation events.
   * Key: ruleId (UUID)
   */
  escalationRules: new Map(),

  /**
   * EscalationLog — log of triggered escalation events.
   * Append-only. Visible to Admin.
   */
  escalationLog: [],

  /**
   * Cycles — goal-setting and check-in phase windows.
   * Key: cycleId (UUID), typically one active cycle per year.
   */
  cycles: new Map(),

  /**
   * OrgHierarchy — reporting line relationships.
   * Key: userId (the employee/manager)
   * Value: { managerId, department, level }
   */
  orgHierarchy: new Map(),
};

export default store;
