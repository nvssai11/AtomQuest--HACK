/**
 * @module goalsService
 * @description Business logic for Goal and Goal Sheet lifecycle management.
 */

import { v4 as uuidv4 } from 'uuid';
import goalRepository from '../repository/goalRepository.js';
import userRepository from '../repository/userRepository.js';
import cycleRepository from '../repository/cycleRepository.js';
import store from '../store/inMemoryStore.js';
import validationService from './validation.js';
import auditService from './audit.js';
import { AppError } from '../errors/AppError.js';

const goalsService = {
  /**
   * Retrieves or creates a Goal Sheet for the current cycle.
   * @param {string} employeeId 
   */
  getOrCreateSheet(employeeId) {
    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) throw AppError.badRequest('No active cycle found.');

    let sheet = goalRepository.findSheetByEmployeeAndCycle(employeeId, cycle.id);
    if (!sheet) {
      sheet = goalRepository.saveSheet({
        id: uuidv4(),
        employeeId,
        cycleId: cycle.id,
        year: cycle.year,
        status: 'draft',
        submittedAt: null,
        approvedAt: null,
        approvedBy: null,
        returnComment: null,
        lockedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return sheet;
  },

  /**
   * Fetch goals for a user (scoped by role context).
   */
  getGoalsForEmployee(employeeId) {
    const sheet = this.getOrCreateSheet(employeeId);
    const goals = goalRepository.findGoalsBySheetId(sheet.id);
    return { sheet, goals };
  },

  getShareRecipients(user) {
    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) throw AppError.badRequest('No active cycle found.');

    const getRecipientCapacity = (employeeIds) => {
      const idSet = new Set(employeeIds);

      // Preload & index goal sheets for this cycle and employee list
      const allSheets = goalRepository.findAllSheets();
      const sheetsByEmployeeId = new Map();
      for (const sheet of allSheets) {
        if (sheet.cycleId === cycle.id && idSet.has(sheet.employeeId)) {
          sheetsByEmployeeId.set(sheet.employeeId, sheet);
        }
      }

      const sheetIds = Array.from(sheetsByEmployeeId.values()).map((s) => s.id);
      const sheetIdSet = new Set(sheetIds);

      // Preload & index goals for the relevant goal sheets
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

      return employeeIds.map((empId) => {
        const employee = userRepository.findById(empId);
        if (!employee) return null;

        const sheet = sheetsByEmployeeId.get(empId) || null;
        const goals = sheet ? (goalsBySheetId.get(sheet.id) || []) : [];
        const totalWeightage = goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0);

        return {
          ...userRepository.toPublicProfile(employee),
          sheetStatus: sheet?.status || 'draft',
          goalCount: goals.length,
          totalWeightage,
          remainingWeightage: Math.max(100 - totalWeightage, 0),
        };
      }).filter(Boolean);
    };

    if (user.role === 'admin') {
      const adminIds = userRepository.findByRole('employee').map((e) => e.id);
      return getRecipientCapacity(adminIds);
    }

    if (user.role === 'manager') {
      const reportIds = userRepository.findDirectReports(user.id).map((e) => e.id);
      return getRecipientCapacity(reportIds);
    }

    throw AppError.forbidden('Only managers or admins can view shared goal recipients.');
  },

  /**
   * Create a new goal.
   */
  createGoal(user, payload) {
    const sheet = this.getOrCreateSheet(user.id);

    if (sheet.status === 'submitted' || sheet.status === 'approved') {
      throw AppError.forbidden(`Cannot add goals. Sheet status is ${sheet.status}.`);
    }

    const existingGoals = goalRepository.findGoalsBySheetId(sheet.id);
    validationService.validateGoalAddition(existingGoals);
    validationService.validateWeightageCapacity(existingGoals, payload.weightage);
    validationService.validateGoalTarget(payload.uom, payload.target);

    const goal = {
      id: uuidv4(),
      goalSheetId: sheet.id,
      employeeId: user.id,
      ...payload,
      isShared: false,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      goal: goalRepository.saveGoal(goal),
      sheet,
    };
  },

  /**
   * Update an existing goal. Handles both pre-submission edits
   * and post-lock edits (with audit trailing).
   */
  updateGoal(goalId, updates, user) {
    const goal = goalRepository.findGoalById(goalId);
    if (!goal) throw AppError.notFound('Goal');

    const sheet = goalRepository.findSheetById(goal.goalSheetId);
    
    if (user.role === 'employee' && user.id !== goal.employeeId) {
      throw AppError.forbidden('Cannot edit another employee\'s goal.');
    }

    if (user.role === 'manager') {
      const employee = userRepository.findById(sheet.employeeId);
      if (employee?.managerId !== user.id) {
        throw AppError.forbidden('You are not the manager for this employee.');
      }
    }

    // Recipients of shared goals may adjust weightage only; the primary owner
    // keeps control of title/target fields on the master KPI.
    if (goal.isShared && goal.primaryOwnerId !== user.id) {
      validationService.validateSharedGoalEdit(goal, updates);
    }

    if (user.role === 'manager' && sheet.status === 'submitted') {
      const managerEditableFields = new Set(['target', 'weightage']);
      const invalidFields = Object.keys(updates).filter((field) => !managerEditableFields.has(field));
      if (invalidFields.length > 0) {
        throw AppError.forbidden('Managers may edit only target and weightage during approval.');
      }
    }

    if (updates.weightage !== undefined) {
      const sheetGoals = goalRepository.findGoalsBySheetId(sheet.id);
      validationService.validateWeightageCapacity(sheetGoals, updates.weightage, goal.id);
    }

    if (updates.uom !== undefined || updates.target !== undefined) {
      validationService.validateGoalTarget(updates.uom ?? goal.uom, updates.target ?? goal.target);
    }

    // Edit restrictions based on status
    if (goal.isLocked) {
      if (user.role !== 'admin') {
        throw AppError.goalLocked(goalId);
      }
      
      // If Admin or Manager is editing a locked goal, log it to audit trail
      for (const [key, value] of Object.entries(updates)) {
        auditService.logGoalEdit({
          goalId: goal.id,
          field: key,
          oldValue: goal[key],
          newValue: value,
          performedBy: user,
          reason: 'Post-lock administrative edit'
        });
      }
    } else if (sheet.status === 'submitted' && user.role === 'employee') {
      throw AppError.forbidden('Cannot edit goals while sheet is pending approval.');
    }

    const updatedGoal = goalRepository.saveGoal({
      ...goal,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    if (updatedGoal.isShared && updates.weightage !== undefined && updatedGoal.sharedGoalLinkId) {
      const link = goalRepository.findSharedLinkByRecipientGoal(updatedGoal.id);
      if (link) {
        goalRepository.saveSharedLink({
          ...link,
          weightage: updates.weightage,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return updatedGoal;
  },

  /**
   * Delete a goal.
   */
  deleteGoal(goalId, user) {
    const goal = goalRepository.findGoalById(goalId);
    if (!goal) return;

    if (goal.isLocked) {
        throw AppError.forbidden('Cannot delete a locked goal.');
    }

    // Owner check: Ensure only the goal owner can delete the goal
    if (goal.employeeId !== user.id) {
        throw AppError.forbidden('You are not authorized to delete this goal.');
    }

    const sheet = goalRepository.findSheetById(goal.goalSheetId);
    if (sheet.status === 'submitted' && user.role === 'employee') {
        throw AppError.forbidden('Cannot delete goals while sheet is pending approval.');
    }

    goalRepository.deleteGoal(goalId);
  },

  /**
   * Submit goal sheet for approval.
   */
  submitGoalSheet(sheetId, user) {
    const sheet = goalRepository.findSheetById(sheetId);
    if (!sheet) throw AppError.notFound('Goal Sheet');
    if (sheet.employeeId !== user.id) throw AppError.forbidden('Access denied.');

    if (!['draft', 'returned'].includes(sheet.status)) {
      throw AppError.badRequest(`Cannot submit sheet in status: ${sheet.status}`);
    }

    const goals = goalRepository.findGoalsBySheetId(sheet.id);
    validationService.validateGoalSheetForSubmission(goals);

    const updatedSheet = goalRepository.saveSheet({
      ...sheet,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      returnComment: null,
      updatedAt: new Date().toISOString(),
    });

    return updatedSheet;
  },

  /**
   * Manager/Admin pushes a departmental KPI to multiple employees (shared goal).
   */
  pushSharedGoal(pusher, { title, description, thrustArea, uom, target, targetUnit, recipientIds, weightage }) {
    if (pusher.role !== 'manager' && pusher.role !== 'admin') {
      throw AppError.forbidden('Only managers or admins can push shared goals.');
    }

    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) throw AppError.badRequest('No active cycle found.');

    const uniqueRecipientIds = [...new Set(recipientIds)];
    if (uniqueRecipientIds.length === 0) {
      throw AppError.badRequest('At least one recipient is required.');
    }

    const masterSheet = this.getOrCreateSheet(pusher.id);
    if (['submitted', 'approved'].includes(masterSheet.status)) {
      throw AppError.badRequest(`Cannot push from a ${masterSheet.status} goal sheet.`);
    }

    const masterGoals = goalRepository.findGoalsBySheetId(masterSheet.id);
    validationService.validateGoalAddition(masterGoals);
    validationService.validateWeightageCapacity(masterGoals, weightage);
    validationService.validateGoalTarget(uom, target);

    const masterGoal = goalRepository.saveGoal({
      id: uuidv4(),
      goalSheetId: masterSheet.id,
      employeeId: pusher.id,
      thrustArea,
      title,
      description,
      uom,
      target,
      targetUnit: targetUnit || '',
      weightage,
      isShared: true,
      primaryOwnerId: pusher.id,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const links = [];

    for (const recipientId of uniqueRecipientIds) {
      const recipient = userRepository.findById(recipientId);
      if (!recipient || recipient.role !== 'employee') continue;

      if (pusher.role === 'manager' && recipient.managerId !== pusher.id) {
        throw AppError.forbidden(`Cannot push goal to non-direct report: ${recipient.name}`);
      }

      const recipientSheet = this.getOrCreateSheet(recipientId);
      if (['submitted', 'approved'].includes(recipientSheet.status)) {
        throw AppError.badRequest(`Cannot push to ${recipient.name}: sheet is ${recipientSheet.status}.`);
      }

      const recipientGoals = goalRepository.findGoalsBySheetId(recipientSheet.id);
      validationService.validateGoalAddition(recipientGoals);
      validationService.validateWeightageCapacity(recipientGoals, weightage);

      const linkId = uuidv4();
      const recipientGoal = goalRepository.saveGoal({
        id: uuidv4(),
        goalSheetId: recipientSheet.id,
        employeeId: recipientId,
        thrustArea,
        title,
        description,
        uom,
        target,
        targetUnit: targetUnit || '',
        weightage,
        isShared: true,
        primaryOwnerId: pusher.id,
        sharedGoalLinkId: linkId,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      goalRepository.saveSharedLink({
        id: linkId,
        masterGoalId: masterGoal.id,
        recipientId,
        recipientGoalId: recipientGoal.id,
        weightage,
        pushedBy: pusher.id,
        pushedAt: new Date().toISOString(),
      });

      store.notifications.push({
        id: uuidv4(),
        userId: recipientId,
        type: 'goal',
        text: `🎯 Shared Department KPI pushed by ${pusher.name}: "${title}"`,
        createdAt: new Date().toISOString()
      });

      links.push({ recipientId, recipientGoalId: recipientGoal.id });
    }

    return { masterGoal, links };
  },
};

export default goalsService;