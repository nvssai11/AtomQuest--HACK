/**
 * @module auditService
 * @description Service for managing the append-only audit trail.
 */

import { v4 as uuidv4 } from 'uuid';
import auditRepository from '../repository/auditRepository.js';

const auditService = {
  /**
   * Logs a change to a goal field.
   * If oldValue and newValue are the same, no log is created.
   * 
   * @param {Object} params 
   * @param {string} params.goalId
   * @param {string} params.field Name of the field changed
   * @param {any} params.oldValue
   * @param {any} params.newValue
   * @param {Object} params.performedBy { id, name }
   * @param {string} params.reason Why the change was made
   */
  logGoalEdit({ goalId, field, oldValue, newValue, performedBy, reason }) {
    // Stringify for strict comparison and safe storage
    const oldStr = String(oldValue);
    const newStr = String(newValue);

    if (oldStr === newStr) {
      return; // No actual change
    }

    const entry = {
      id: uuidv4(),
      entityType: 'goal',
      entityId: goalId,
      action: 'FIELD_UPDATED',
      field,
      oldValue: oldStr,
      newValue: newStr,
      performedBy: performedBy.id,
      performedByName: performedBy.name,
      reason,
      timestamp: new Date().toISOString(),
    };

    return auditRepository.append(entry);
  },

  /**
   * Logs the unlocking of a goal by an admin.
   * 
   * @param {string} goalId 
   * @param {Object} performedBy { id, name }
   * @param {string} reason 
   */
  logGoalUnlock(goalId, performedBy, reason) {
    const entry = {
      id: uuidv4(),
      entityType: 'goal',
      entityId: goalId,
      action: 'GOAL_UNLOCKED',
      field: 'isLocked',
      oldValue: 'true',
      newValue: 'false',
      performedBy: performedBy.id,
      performedByName: performedBy.name,
      reason,
      timestamp: new Date().toISOString(),
    };

    return auditRepository.append(entry);
  },

  /**
   * Retrieves the audit trail for a specific goal.
   * @param {string} goalId 
   * @returns {Object[]}
   */
  getAuditTrailForGoal(goalId) {
    return auditRepository.findByEntityId(goalId);
  },

  /**
   * Retrieves the entire system audit trail (for Admin).
   * @returns {Object[]}
   */
  getFullAuditTrail() {
    return auditRepository.findAll();
  },

  /**
   * Recent activity for dashboard (all authenticated roles).
   * @param {number} [limit=10]
   */
  getRecentActivity(limit = 10) {
    return auditRepository.findRecent(limit);
  },
};

export default auditService;
