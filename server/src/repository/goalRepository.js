/**
 * @module goalRepository
 * @description Data access layer for Goals, Goal Sheets, and Shared Goal Links.
 */

import store from '../store/inMemoryStore.js';

const goalRepository = {
  // ─── Goal Sheets ────────────────────────────────────────────────────────
  
  /**
   * Find a Goal Sheet by its ID.
   * @param {string} sheetId 
   * @returns {Object|null}
   */
  findSheetById(sheetId) {
    return store.goalSheets.get(sheetId) ?? null;
  },

  /**
   * Find a Goal Sheet for a specific employee and cycle.
   * @param {string} employeeId 
   * @param {string} cycleId 
   * @returns {Object|null}
   */
  findSheetByEmployeeAndCycle(employeeId, cycleId) {
    for (const sheet of store.goalSheets.values()) {
      if (sheet.employeeId === employeeId && sheet.cycleId === cycleId) {
        return sheet;
      }
    }
    return null;
  },

  /**
   * Save (create or update) a Goal Sheet.
   * @param {Object} sheet 
   * @returns {Object} The saved sheet
   */
  saveSheet(sheet) {
    store.goalSheets.set(sheet.id, sheet);
    return sheet;
  },

  /**
   * Find goal sheets for a set of employees, optionally filtered by status.
   * @param {string[]} employeeIds
   * @param {string|null} [status] - e.g. 'submitted', 'approved'
   * @returns {Object[]}
   */
  findSheetsByEmployeeIds(employeeIds, status = null) {
    const idSet = new Set(employeeIds);
    return Array.from(store.goalSheets.values()).filter((sheet) => {
      if (!idSet.has(sheet.employeeId)) return false;
      if (status && sheet.status !== status) return false;
      return true;
    });
  },

  // ─── Goals ──────────────────────────────────────────────────────────────

  /**
   * Find a Goal by its ID.
   * @param {string} goalId 
   * @returns {Object|null}
   */
  findGoalById(goalId) {
    return store.goals.get(goalId) ?? null;
  },

  /**
   * Find all Goals belonging to a specific Goal Sheet.
   * @param {string} sheetId 
   * @returns {Object[]}
   */
  findGoalsBySheetId(sheetId) {
    return Array.from(store.goals.values())
      .filter((g) => g.goalSheetId === sheetId)
      // Sort by creation time to maintain consistent order
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  /**
   * Save (create or update) a Goal.
   * @param {Object} goal 
   * @returns {Object}
   */
  saveGoal(goal) {
    store.goals.set(goal.id, goal);
    return goal;
  },

  /**
   * Delete a Goal by its ID.
   * @param {string} goalId 
   * @returns {boolean} True if deleted, false if it didn't exist
   */
  deleteGoal(goalId) {
    return store.goals.delete(goalId);
  },

  // ─── Shared Goal Links ──────────────────────────────────────────────────

  /**
   * Find all shared goal links where a given goal is the master.
   * Used when updating achievements on a shared departmental KPI to sync down.
   * @param {string} masterGoalId 
   * @returns {Object[]}
   */
  findSharedLinksByMaster(masterGoalId) {
    return Array.from(store.sharedGoalLinks.values())
      .filter((link) => link.masterGoalId === masterGoalId);
  },

  /**
   * Find the shared-goal link for a recipient goal.
   * @param {string} recipientGoalId
   * @returns {Object|null}
   */
  findSharedLinkByRecipientGoal(recipientGoalId) {
    for (const link of store.sharedGoalLinks.values()) {
      if (link.recipientGoalId === recipientGoalId) return link;
    }
    return null;
  },

  /**
   * Save a shared goal link.
   * @param {Object} link 
   * @returns {Object}
   */
  saveSharedLink(link) {
    store.sharedGoalLinks.set(link.id, link);
    return link;
  }
};

export default goalRepository;
