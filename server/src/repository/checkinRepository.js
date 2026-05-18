/**
 * @module checkinRepository
 * @description Data access layer for Quarterly Check-ins and Self-Assessments.
 */

import store from '../store/inMemoryStore.js';

// Secondary Indexes for O(1) performance
const checkInsByEmpCycleQuarterIndex = new Map(); // employeeId:cycleId:quarter -> checkIn
const checkInsBySheetIdIndex = new Map(); // goalSheetId -> Set of checkIns
const selfAssessmentsByEmpCycleQuarterIndex = new Map(); // employeeId:cycleId:quarter -> assessment

let lastCheckInsSize = -1;
let lastSelfAssessmentsSize = -1;

function rebuildCheckInIndexes() {
  checkInsByEmpCycleQuarterIndex.clear();
  checkInsBySheetIdIndex.clear();
  selfAssessmentsByEmpCycleQuarterIndex.clear();

  for (const checkIn of store.checkIns.values()) {
    const key = `${checkIn.employeeId}:${checkIn.cycleId}:${checkIn.quarter}`;
    checkInsByEmpCycleQuarterIndex.set(key, checkIn);

    if (!checkInsBySheetIdIndex.has(checkIn.goalSheetId)) {
      checkInsBySheetIdIndex.set(checkIn.goalSheetId, new Set());
    }
    checkInsBySheetIdIndex.get(checkIn.goalSheetId).add(checkIn);
  }

  for (const assessment of store.selfAssessments.values()) {
    const key = `${assessment.employeeId}:${assessment.cycleId}:${assessment.quarter}`;
    selfAssessmentsByEmpCycleQuarterIndex.set(key, assessment);
  }

  lastCheckInsSize = store.checkIns.size;
  lastSelfAssessmentsSize = store.selfAssessments.size;
}

// Auto-reactive index rebuild if store collections update or reset
function ensureCheckInIndexes() {
  if (
    store.checkIns.size !== lastCheckInsSize ||
    store.selfAssessments.size !== lastSelfAssessmentsSize
  ) {
    rebuildCheckInIndexes();
  }
}

const checkinRepository = {
  // ─── Check-Ins ────────────────────────────────────────────────────────────

  /**
   * Find a check-in by its ID.
   * @param {string} checkInId 
   * @returns {Object|null}
   */
  findById(checkInId) {
    return store.checkIns.get(checkInId) ?? null;
  },

  /**
   * Find a check-in for a specific employee, cycle, and quarter.
   * @param {string} employeeId 
   * @param {string} cycleId 
   * @param {string} quarter 'Q1', 'Q2', 'Q3', 'Q4'
   * @returns {Object|null}
   */
  findByEmployeeCycleAndQuarter(employeeId, cycleId, quarter) {
    ensureCheckInIndexes();
    const key = `${employeeId}:${cycleId}:${quarter}`;
    return checkInsByEmpCycleQuarterIndex.get(key) ?? null;
  },

  /**
   * Find all check-ins for a specific goal sheet (all quarters).
   * @param {string} goalSheetId 
   * @returns {Object[]}
   */
  findByGoalSheetId(goalSheetId) {
    ensureCheckInIndexes();
    const set = checkInsBySheetIdIndex.get(goalSheetId);
    return set ? Array.from(set) : [];
  },

  /**
   * Save (create or update) a check-in.
   * @param {Object} checkIn 
   * @returns {Object}
   */
  save(checkIn) {
    store.checkIns.set(checkIn.id, checkIn);
    rebuildCheckInIndexes();
    return checkIn;
  },

  // ─── Self-Assessments ───────────────────────────────────────────────────

  /**
   * Save a self-assessment.
   * @param {Object} assessment 
   * @returns {Object}
   */
  saveSelfAssessment(assessment) {
    store.selfAssessments.set(assessment.id, assessment);
    rebuildCheckInIndexes();
    return assessment;
  },

  /**
   * Find self-assessment for an employee's specific quarter.
   * @param {string} employeeId 
   * @param {string} cycleId 
   * @param {string} quarter 
   * @returns {Object|null}
   */
  findSelfAssessment(employeeId, cycleId, quarter) {
    ensureCheckInIndexes();
    const key = `${employeeId}:${cycleId}:${quarter}`;
    return selfAssessmentsByEmpCycleQuarterIndex.get(key) ?? null;
  },

  /**
   * Find all check-ins.
   * @returns {Object[]}
   */
  findAll() {
    return Array.from(store.checkIns.values());
  }
};

export default checkinRepository;
