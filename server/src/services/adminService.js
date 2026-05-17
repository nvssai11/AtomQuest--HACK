/**
 * @module adminService
 * @description Business logic for Admin/HR governance operations.
 */

import goalRepository from '../repository/goalRepository.js';
import cycleRepository from '../repository/cycleRepository.js';
import auditService from './audit.js';
import userRepository from '../repository/userRepository.js';
import { AppError } from '../errors/AppError.js';

const adminService = {
  /**
   * Unlocks an approved goal so the employee can edit it again.
   * Forces an audit log entry.
   * 
   * @param {string} goalId 
   * @param {string} reason 
   * @param {Object} adminUser 
   */
  unlockGoal(goalId, reason, adminUser) {
    const goal = goalRepository.findGoalById(goalId);
    if (!goal) throw AppError.notFound('Goal');

    if (!goal.isLocked) {
      throw AppError.badRequest('Goal is already unlocked.');
    }

    // 1. Log the unlock action to the immutable audit trail
    auditService.logGoalUnlock(goalId, adminUser, reason);

    // 2. Update the goal state
    goal.isLocked = false;
    goal.unlockedAt = new Date().toISOString();
    goal.unlockedBy = adminUser.id;
    goal.unlockReason = reason;
    goal.updatedAt = new Date().toISOString();

    return goalRepository.saveGoal(goal);
  },

  /**
   * Progresses the performance cycle to a new phase.
   * (e.g. 'goal-setting' -> 'Q1' -> 'Q2')
   * 
   * @param {string} newPhase 
   */
  updateCyclePhase(newPhase) {
    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) throw AppError.notFound('Active Cycle');

    const currentPhase = cycle.activePhase;

    // Close the current phase if it exists
    if (currentPhase && cycle.phases[currentPhase]) {
      cycle.phases[currentPhase].status = 'closed';
    }

    // Open the new phase
    if (cycle.phases[newPhase]) {
      cycle.phases[newPhase].status = 'active';
      cycle.activePhase = newPhase;
    }

    cycle.updatedAt = new Date().toISOString();

    return cycleRepository.save(cycle);
  },

  /**
   * Retrieves the org hierarchy tree.
   * Used for the Admin dashboard visualization.
   */
  getOrgHierarchy() {
    return userRepository.getAllHierarchy();
  },

  getActiveCycle() {
    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) throw AppError.notFound('Active Cycle');
    return cycle;
  },
};

export default adminService;
