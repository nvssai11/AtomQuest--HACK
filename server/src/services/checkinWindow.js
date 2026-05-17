/**
 * @module checkinWindowService
 * @description Service for enforcing the BRD rules around quarterly check-in schedules.
 */

import cycleRepository from '../repository/cycleRepository.js';
import { AppError } from '../errors/AppError.js';

const checkinWindowService = {
  /**
   * Validates if a particular quarter is currently open for check-in submissions.
   * Throws if closed.
   * 
   * @param {string} quarter 'Q1', 'Q2', 'Q3', 'Q4'
   * @throws {AppError} If window is closed or no active cycle
   */
  validateCheckinWindow(quarter) {
    const cycle = cycleRepository.findActiveCycle();
    
    if (!cycle) {
      throw AppError.forbidden('No active performance cycle found.');
    }

    if (cycle.activePhase !== quarter || cycle.phases[quarter].status !== 'active') {
      throw AppError.windowClosed(quarter);
    }
  },

  /**
   * Returns the string identifier for the current active quarter,
   * or null if the system is in goal-setting or closed phase.
   * 
   * @returns {string|null} e.g. 'Q1'
   */
  getActiveQuarter() {
    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) return null;

    const phase = cycle.activePhase;
    // Only return if it's a Q-phase, not goal-setting or closed
    if (['Q1', 'Q2', 'Q3', 'Q4'].includes(phase) && cycle.phases[phase].status === 'active') {
      return phase;
    }
    
    return null;
  }
};

export default checkinWindowService;
