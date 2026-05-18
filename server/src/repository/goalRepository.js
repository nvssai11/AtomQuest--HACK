/**
 * @module goalRepository
 * @description Data access layer for Goals, Goal Sheets, and Shared Goal Links.
 */

import store from '../store/inMemoryStore.js';

// Secondary Indexes for O(1) performance
const sheetsByEmpAndCycleIndex = new Map(); // employeeId:cycleId -> sheet
const sheetsByEmployeeIndex = new Map(); // employeeId -> Set of sheets
const goalsBySheetIdIndex = new Map(); // sheetId -> Set of goals
const sharedLinksByMasterIndex = new Map(); // masterGoalId -> Set of links
const sharedLinkByRecipientGoalIndex = new Map(); // recipientGoalId -> link

let lastSheetsSize = -1;
let lastGoalsSize = -1;
let lastLinksSize = -1;

function rebuildGoalIndexes() {
  sheetsByEmpAndCycleIndex.clear();
  sheetsByEmployeeIndex.clear();
  goalsBySheetIdIndex.clear();
  sharedLinksByMasterIndex.clear();
  sharedLinkByRecipientGoalIndex.clear();

  for (const sheet of store.goalSheets.values()) {
    sheetsByEmpAndCycleIndex.set(`${sheet.employeeId}:${sheet.cycleId}`, sheet);
    if (!sheetsByEmployeeIndex.has(sheet.employeeId)) {
      sheetsByEmployeeIndex.set(sheet.employeeId, new Set());
    }
    sheetsByEmployeeIndex.get(sheet.employeeId).add(sheet);
  }

  for (const goal of store.goals.values()) {
    if (!goalsBySheetIdIndex.has(goal.goalSheetId)) {
      goalsBySheetIdIndex.set(goal.goalSheetId, new Set());
    }
    goalsBySheetIdIndex.get(goal.goalSheetId).add(goal);
  }

  for (const link of store.sharedGoalLinks.values()) {
    if (!sharedLinksByMasterIndex.has(link.masterGoalId)) {
      sharedLinksByMasterIndex.set(link.masterGoalId, new Set());
    }
    sharedLinksByMasterIndex.get(link.masterGoalId).add(link);
    sharedLinkByRecipientGoalIndex.set(link.recipientGoalId, link);
  }

  lastSheetsSize = store.goalSheets.size;
  lastGoalsSize = store.goals.size;
  lastLinksSize = store.sharedGoalLinks.size;
}

// Auto-reactive index rebuild if store collections update or reset
function ensureGoalIndexes() {
  if (
    store.goalSheets.size !== lastSheetsSize ||
    store.goals.size !== lastGoalsSize ||
    store.sharedGoalLinks.size !== lastLinksSize
  ) {
    rebuildGoalIndexes();
  }
}

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
    ensureGoalIndexes();
    return sheetsByEmpAndCycleIndex.get(`${employeeId}:${cycleId}`) ?? null;
  },

  /**
   * Save (create or update) a Goal Sheet.
   * @param {Object} sheet 
   * @returns {Object} The saved sheet
   */
  saveSheet(sheet) {
    store.goalSheets.set(sheet.id, sheet);
    rebuildGoalIndexes();
    return sheet;
  },

  /**
   * Find goal sheets for a set of employees, optionally filtered by status.
   * @param {string[]} employeeIds
   * @param {string|null} [status] - e.g. 'submitted', 'approved'
   * @returns {Object[]}
   */
  findSheetsByEmployeeIds(employeeIds, status = null) {
    ensureGoalIndexes();
    const results = [];
    for (const empId of employeeIds) {
      const sheets = sheetsByEmployeeIndex.get(empId);
      if (sheets) {
        sheets.forEach(sheet => {
          if (!status || sheet.status === status) {
            results.push(sheet);
          }
        });
      }
    }
    return results;
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
    ensureGoalIndexes();
    const set = goalsBySheetIdIndex.get(sheetId);
    const goals = set ? Array.from(set) : [];
    // Sort by creation time to maintain consistent order
    return goals.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  /**
   * Save (create or update) a Goal.
   * @param {Object} goal 
   * @returns {Object}
   */
  saveGoal(goal) {
    store.goals.set(goal.id, goal);
    rebuildGoalIndexes();
    return goal;
  },

  /**
   * Delete a Goal by its ID.
   * @param {string} goalId 
   * @returns {boolean} True if deleted, false if it didn't exist
   */
  deleteGoal(goalId) {
    const deleted = store.goals.delete(goalId);
    if (deleted) rebuildGoalIndexes();
    return deleted;
  },

  // ─── Shared Goal Links ──────────────────────────────────────────────────

  /**
   * Find all shared goal links where a given goal is the master.
   * @param {string} masterGoalId 
   * @returns {Object[]}
   */
  findSharedLinksByMaster(masterGoalId) {
    ensureGoalIndexes();
    const set = sharedLinksByMasterIndex.get(masterGoalId);
    return set ? Array.from(set) : [];
  },

  /**
   * Find the shared-goal link for a recipient goal.
   * @param {string} recipientGoalId
   * @returns {Object|null}
   */
  findSharedLinkByRecipientGoal(recipientGoalId) {
    ensureGoalIndexes();
    return sharedLinkByRecipientGoalIndex.get(recipientGoalId) ?? null;
  },

  /**
   * Save a shared goal link.
   * @param {Object} link 
   * @returns {Object}
   */
  saveSharedLink(link) {
    store.sharedGoalLinks.set(link.id, link);
    rebuildGoalIndexes();
    return link;
  },

  // ─── Bulk Queries for Optimization ──────────────────────────────────────

  /**
   * Find all goal sheets in the store.
   * @returns {Object[]}
   */
  findAllSheets() {
    return Array.from(store.goalSheets.values());
  },

  /**
   * Find all goals in the store.
   * @returns {Object[]}
   */
  findAllGoals() {
    return Array.from(store.goals.values());
  }
};

export default goalRepository;
