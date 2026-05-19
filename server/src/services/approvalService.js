/**
 * @module approvalService
 * @description Manager workflow for reviewing and approving goal sheets.
 */

import { v4 as uuidv4 } from 'uuid';
import goalRepository from '../repository/goalRepository.js';
import userRepository from '../repository/userRepository.js';
import cycleRepository from '../repository/cycleRepository.js';
import store from '../store/inMemoryStore.js';
import validationService from './validation.js';
import { AppError } from '../errors/AppError.js';

function assertManagerOfEmployee(managerId, employeeId) {
  const hierarchy = userRepository.getHierarchy(employeeId);
  if (hierarchy?.managerId !== managerId) {
    throw AppError.forbidden('You are not the manager for this employee.');
  }
}

const approvalService = {
  /**
   * Goal sheets submitted by direct reports, awaiting manager action.
   */
  getPendingApprovals(managerId) {
    const reports = userRepository.findDirectReports(managerId);
    const reportMap = new Map(reports.map((r) => [r.id, r]));

    return goalRepository
      .findSheetsByEmployeeIds(reports.map((r) => r.id), 'submitted')
      .map((sheet) => {
        const user = reportMap.get(sheet.employeeId);
        return {
          ...sheet,
          employeeName: user?.name ?? 'Unknown',
          employeeDepartment: user?.department ?? '',
        };
      });
  },

  /**
   * Full sheet + goals for manager review.
   */
  getSheetForReview(sheetId, managerId) {
    const sheet = goalRepository.findSheetById(sheetId);
    if (!sheet) throw AppError.notFound('Goal Sheet');

    assertManagerOfEmployee(managerId, sheet.employeeId);

    const employee = userRepository.findById(sheet.employeeId);
    const goals = goalRepository.findGoalsBySheetId(sheetId);

    return {
      sheet,
      goals,
      employee: userRepository.toPublicProfile(employee),
    };
  },

  approveSheet(sheetId, managerId, edits = []) {
    const sheet = goalRepository.findSheetById(sheetId);
    if (!sheet) throw AppError.notFound('Goal Sheet');

    assertManagerOfEmployee(managerId, sheet.employeeId);

    // ✅ Add cycle phase check: only allow approvals during the approval phase
    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) throw AppError.badRequest('No active cycle');
    if (cycle.activePhase !== 'approval') {
      throw AppError.forbidden(
        `Cannot approve goals outside approval phase. Current phase: ${cycle.activePhase}`
      );
    }

    if (sheet.status !== 'submitted') {
      throw AppError.badRequest('Sheet is not pending approval.');
    }

    let goals = goalRepository.findGoalsBySheetId(sheetId);
    const goalsById = new Map(goals.map((goal) => [goal.id, goal]));

    for (const edit of edits || []) {
      const goal = goalsById.get(edit.goalId);
      if (!goal) {
        throw AppError.badRequest(`Goal ${edit.goalId} does not belong to this sheet.`);
      }

      const updatedGoal = {
        ...goal,
        ...(edit.target !== undefined ? { target: edit.target } : {}),
        ...(edit.weightage !== undefined ? { weightage: edit.weightage } : {}),
        updatedAt: new Date().toISOString(),
      };
      goalsById.set(goal.id, updatedGoal);
    }

    goals = Array.from(goalsById.values());
    validationService.validateGoalSheetForSubmission(goals);

    for (const goal of goals) {
      goalRepository.saveGoal({
        ...goal,
        isLocked: true,
        updatedAt: new Date().toISOString(),
      });
    }

    const manager = userRepository.findById(managerId);

    store.notifications.push({
      id: uuidv4(),
      userId: sheet.employeeId,
      type: 'success',
      text: `🎉 Manager ${manager?.name || 'John'} approved your goal sheet revisions.`,
      createdAt: new Date().toISOString()
    });

    return goalRepository.saveSheet({
      ...sheet,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: managerId,
      lockedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  returnSheet(sheetId, managerId, comment) {
    if (!comment?.trim()) {
      throw AppError.badRequest('A comment is required when returning a sheet.');
    }

    const sheet = goalRepository.findSheetById(sheetId);
    if (!sheet) throw AppError.notFound('Goal Sheet');

    assertManagerOfEmployee(managerId, sheet.employeeId);

    if (sheet.status !== 'submitted') {
      throw AppError.badRequest('Sheet is not pending approval.');
    }

    const manager = userRepository.findById(managerId);

    store.notifications.push({
      id: uuidv4(),
      userId: sheet.employeeId,
      type: 'alert',
      text: `⚠️ Manager ${manager?.name || 'John'} returned your goal sheet: "${comment.trim()}"`,
      createdAt: new Date().toISOString()
    });

    return goalRepository.saveSheet({
      ...sheet,
      status: 'returned',
      returnComment: comment.trim(),
      submittedAt: null,
      updatedAt: new Date().toISOString(),
    });
  },
};

export default approvalService;
