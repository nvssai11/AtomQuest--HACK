/**
 * @module checkinRepository
 * @description Data access layer for Quarterly Check-ins and Self-Assessments.
 */

import store from '../store/inMemoryStore.js';

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
    for (const checkIn of store.checkIns.values()) {
      if (
        checkIn.employeeId === employeeId &&
        checkIn.cycleId === cycleId &&
        checkIn.quarter === quarter
      ) {
        return checkIn;
      }
    }
    return null;
  },

  /**
   * Find all check-ins for a specific goal sheet (all quarters).
   * @param {string} goalSheetId 
   * @returns {Object[]}
   */
  findByGoalSheetId(goalSheetId) {
    return Array.from(store.checkIns.values())
      .filter((ci) => ci.goalSheetId === goalSheetId);
  },

  /**
   * Save (create or update) a check-in.
   * @param {Object} checkIn 
   * @returns {Object}
   */
  save(checkIn) {
    store.checkIns.set(checkIn.id, checkIn);
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
    for (const assessment of store.selfAssessments.values()) {
      if (
        assessment.employeeId === employeeId &&
        assessment.cycleId === cycleId &&
        assessment.quarter === quarter
      ) {
        return assessment;
      }
    }
    return null;
  }
};

export default checkinRepository;
