/**
 * @module auditRepository
 * @description Data access layer for the append-only Audit Log.
 *
 * DDIA Principle: "Append-only logs provide a robust audit trail and are
 * fundamentally easier to make concurrent than mutable structures."
 * This repository explicitly DOES NOT implement update() or delete() methods.
 */

import store from '../store/inMemoryStore.js';

const auditRepository = {
  /**
   * Append a new entry to the audit log.
   * @param {Object} entry 
   * @returns {Object} The saved entry
   */
  append(entry) {
    // We clone the entry to ensure the reference can't be mutated by the caller later
    const immutableEntry = Object.freeze({ ...entry });
    store.auditLog.push(immutableEntry);
    return immutableEntry;
  },

  /**
   * Find all audit logs for a specific entity (e.g., a specific goal ID).
   * @param {string} entityId 
   * @returns {Object[]}
   */
  findByEntityId(entityId) {
    return store.auditLog
      .filter((log) => log.entityId === entityId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Newest first
  },

  /**
   * Get all audit logs, sorted newest first.
   * Used for the global Admin Audit view.
   * @returns {Object[]}
   */
  findAll() {
    return [...store.auditLog].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  /**
   * Most recent audit entries for dashboard activity feed.
   * @param {number} [limit=10]
   * @returns {Object[]}
   */
  findRecent(limit = 10) {
    return this.findAll().slice(0, limit);
  },
};

export default auditRepository;
