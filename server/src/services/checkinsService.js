/**
 * @module checkinsService
 * @description Business logic for handling quarterly check-ins and progress scores.
 */

import { v4 as uuidv4 } from 'uuid';
import checkinRepository from '../repository/checkinRepository.js';
import goalRepository from '../repository/goalRepository.js';
import userRepository from '../repository/userRepository.js';
import cycleRepository from '../repository/cycleRepository.js';
import checkinWindowService from './checkinWindow.js';
import scoringService from './scoring.js';
import { AppError } from '../errors/AppError.js';

function assertManagerOfEmployee(managerId, employeeId) {
  const employee = userRepository.findById(employeeId);
  if (employee?.managerId !== managerId) {
    throw AppError.forbidden('You are not the manager for this employee.');
  }
}

const checkinsService = {
  submitCheckIn(user, payload) {
    const { quarter, entries } = payload;

    checkinWindowService.validateCheckinWindow(quarter);

    // ✅ Add validation for at least one achievement
    const hasAnyAchievement = (entries || []).some(
      e => e.actualAchievement !== null && e.actualAchievement !== undefined && e.actualAchievement !== ''
    );
    
    if (!hasAnyAchievement) {
      throw AppError.unprocessable('Check-in must contain at least one achievement value.');
    }

    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) throw AppError.badRequest('No active cycle');

    const sheet = goalRepository.findSheetByEmployeeAndCycle(user.id, cycle.id);
    if (!sheet) throw AppError.notFound('Goal Sheet');
    if (sheet.status !== 'approved') {
      throw AppError.forbidden('Cannot submit check-ins for unapproved goal sheets.');
    }

    let checkIn = checkinRepository.findByEmployeeCycleAndQuarter(user.id, cycle.id, quarter);
    const isNew = !checkIn;

    if (isNew) {
      checkIn = {
        id: uuidv4(),
        employeeId: user.id,
        goalSheetId: sheet.id,
        quarter,
        cycleId: cycle.id,
        managerComment: null,
        managerCommentAt: null,
        commentBy: null,
        createdAt: new Date().toISOString(),
      };
    }

    const processedEntries = entries.map((entry) => {
      const goal = goalRepository.findGoalById(entry.goalId);
      if (!goal) throw AppError.badRequest(`Goal ${entry.goalId} not found`);
      if (goal.goalSheetId !== sheet.id) {
        throw AppError.badRequest(`Goal ${entry.goalId} does not belong to your sheet`);
      }

      if (goal.isShared && goal.primaryOwnerId !== user.id) {
        // Recipients of a shared goal must be allowed to submit their own
        // actualAchievement/status. Use the submitter-provided values when
        // present; if absent, fall back to any previously-saved entry.
        const existingEntry = checkIn?.entries?.find((e) => e.goalId === goal.id);
        const actualValue = entry.actualAchievement !== undefined && entry.actualAchievement !== null
          ? entry.actualAchievement
          : (existingEntry ? existingEntry.actualAchievement : '');
        const statusValue = entry.status !== undefined && entry.status !== null
          ? entry.status
          : (existingEntry ? existingEntry.status : 'not-started');

        const computedScore = scoringService.calculateScore(
          goal.uom,
          actualValue,
          goal.target
        );

        return {
          goalId: entry.goalId,
          actualAchievement: actualValue,
          status: statusValue,
          computedScore,
        };
      }

      const computedScore = scoringService.calculateScore(
        goal.uom,
        entry.actualAchievement,
        goal.target
      );

      return {
        goalId: entry.goalId,
        actualAchievement: entry.actualAchievement,
        status: entry.status,
        computedScore,
      };
    });

    checkIn.entries = processedEntries;
    checkIn.submittedAt = new Date().toISOString();
    checkIn.updatedAt = new Date().toISOString();

    const savedCheckIn = checkinRepository.save(checkIn);

    // Batch sync shared-goal entries to recipients with simple in-memory caching
    // to avoid repeated repository calls when multiple master goals map to the
    // same recipient (mitigates N+1 behavior).
    const recipientSheetCache = new Map(); // recipientId -> sheet
    const recipientCheckInCache = new Map(); // recipientId -> checkIn

    // ✅ OPTIMIZED: Pre-load and index goal sheets and check-ins for the active cycle to avoid O(N) queries in nested loops
    const allSheets = goalRepository.findAllSheets();
    const sheetsByEmployeeId = new Map();
    for (const sheet of allSheets) {
      if (sheet.cycleId === cycle.id) {
        sheetsByEmployeeId.set(sheet.employeeId, sheet);
      }
    }

    const allCheckIns = checkinRepository.findAll();
    const checkInsByEmployeeId = new Map();
    for (const ci of allCheckIns) {
      if (ci.cycleId === cycle.id && ci.quarter === quarter) {
        checkInsByEmployeeId.set(ci.employeeId, ci);
      }
    }

    for (const entry of processedEntries) {
      const links = goalRepository.findSharedLinksByMaster(entry.goalId);
      if (!links || links.length === 0) continue;

      for (const link of links) {
        // Cache recipient sheet lookup
        let recipientSheet = recipientSheetCache.get(link.recipientId);
        if (recipientSheet === undefined) {
          recipientSheet = sheetsByEmployeeId.get(link.recipientId) || null;
          recipientSheetCache.set(link.recipientId, recipientSheet);
        }
        if (!recipientSheet) continue;

        // Cache recipient check-in lookup
        let recipientCheckIn = recipientCheckInCache.get(link.recipientId);
        if (recipientCheckIn === undefined) {
          recipientCheckIn = checkInsByEmployeeId.get(link.recipientId) || null;
          if (!recipientCheckIn) {
            recipientCheckIn = {
              id: uuidv4(),
              employeeId: link.recipientId,
              goalSheetId: recipientSheet.id,
              quarter,
              cycleId: cycle.id,
              managerComment: null,
              entries: [],
              createdAt: new Date().toISOString(),
            };
          }
          recipientCheckInCache.set(link.recipientId, recipientCheckIn);
        }

        const recipientGoalId = link.recipientGoalId;
        const updatedEntries = [...(recipientCheckIn.entries || [])];
        const idx = updatedEntries.findIndex((e) => e.goalId === recipientGoalId);
        const syncedEntry = {
          goalId: recipientGoalId,
          actualAchievement: entry.actualAchievement,
          status: entry.status,
          computedScore: entry.computedScore,
        };
        if (idx >= 0) updatedEntries[idx] = syncedEntry;
        else updatedEntries.push(syncedEntry);

        recipientCheckIn.entries = updatedEntries;
        recipientCheckIn.updatedAt = new Date().toISOString();
        // Save to cache only; persist after all links processed for this recipient
        recipientCheckInCache.set(link.recipientId, recipientCheckIn);
      }
    }

    // Persist all cached recipient check-ins in a single pass
    for (const [_, rc] of recipientCheckInCache) {
      checkinRepository.save(rc);
    }

    return savedCheckIn;
  },

  addManagerComment(checkInId, comment, managerUser) {
    const checkIn = checkinRepository.findById(checkInId);
    if (!checkIn) throw AppError.notFound('Check-in');

    assertManagerOfEmployee(managerUser.id, checkIn.employeeId);

    checkIn.managerComment = comment;
    checkIn.managerCommentAt = new Date().toISOString();
    checkIn.commentBy = managerUser.id;
    checkIn.updatedAt = new Date().toISOString();

    return checkinRepository.save(checkIn);
  },

  getCheckInsForSheet(sheetId) {
    return checkinRepository.findByGoalSheetId(sheetId);
  },

  getMyCheckIn(userId, quarter) {
    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) throw AppError.badRequest('No active cycle');
    return checkinRepository.findByEmployeeCycleAndQuarter(userId, cycle.id, quarter) || null;
  },

  /**
   * Manager view: direct reports' check-ins for a quarter.
   */
  getTeamCheckIns(managerId, quarter) {
    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) throw AppError.badRequest('No active cycle');

    const reports = userRepository.findDirectReports(managerId);
    const reportIds = reports.map((e) => e.id);
    const reportIdSet = new Set(reportIds);

    // Preload & index to avoid nested O(N) operations
    const allSheets = goalRepository.findAllSheets();
    const sheetsByEmployeeId = new Map();
    for (const sheet of allSheets) {
      if (sheet.cycleId === cycle.id && reportIdSet.has(sheet.employeeId)) {
        sheetsByEmployeeId.set(sheet.employeeId, sheet);
      }
    }

    const sheetIds = Array.from(sheetsByEmployeeId.values()).map((s) => s.id);
    const sheetIdSet = new Set(sheetIds);

    const allGoals = goalRepository.findAllGoals();
    const goalsBySheetId = new Map();
    for (const goal of allGoals) {
      if (sheetIdSet.has(goal.goalSheetId)) {
        if (!goalsBySheetId.has(goal.goalSheetId)) {
          goalsBySheetId.set(goal.goalSheetId, []);
        }
        goalsBySheetId.get(goal.goalSheetId).push(goal);
      }
    }

    // Sort to maintain correct creation order
    for (const goals of goalsBySheetId.values()) {
      goals.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    const allCheckIns = checkinRepository.findAll();
    const checkInsByEmployeeId = new Map();
    for (const ci of allCheckIns) {
      if (ci.cycleId === cycle.id && ci.quarter === quarter && reportIdSet.has(ci.employeeId)) {
        checkInsByEmployeeId.set(ci.employeeId, ci);
      }
    }

    return reports.map((employee) => {
      const sheet = sheetsByEmployeeId.get(employee.id) || null;
      const goals = sheet ? (goalsBySheetId.get(sheet.id) || []) : [];
      const checkIn = checkInsByEmployeeId.get(employee.id) || null;

      return {
        employee: userRepository.toPublicProfile(employee),
        sheet,
        goals,
        checkIn,
      };
    });
  },
};

export default checkinsService;
