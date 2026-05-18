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
        const existingEntry = checkIn?.entries?.find((e) => e.goalId === goal.id);
        const actualValue = existingEntry ? existingEntry.actualAchievement : '';
        const statusValue = existingEntry ? existingEntry.status : 'not-started';
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

    for (const entry of processedEntries) {
      const links = goalRepository.findSharedLinksByMaster(entry.goalId);
      for (const link of links) {
        const recipientSheet = goalRepository.findSheetByEmployeeAndCycle(
          link.recipientId,
          cycle.id
        );
        if (!recipientSheet) continue;

        let recipientCheckIn = checkinRepository.findByEmployeeCycleAndQuarter(
          link.recipientId,
          cycle.id,
          quarter
        );

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
        checkinRepository.save(recipientCheckIn);
      }
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

    return reports.map((employee) => {
      const sheet = goalRepository.findSheetByEmployeeAndCycle(employee.id, cycle.id);
      const goals = sheet ? goalRepository.findGoalsBySheetId(sheet.id) : [];
      const checkIn = checkinRepository.findByEmployeeCycleAndQuarter(
        employee.id,
        cycle.id,
        quarter
      );

      return {
        employee: userRepository.toPublicProfile(employee),
        sheet,
        goals,
        checkIn: checkIn || null,
      };
    });
  },
};

export default checkinsService;
