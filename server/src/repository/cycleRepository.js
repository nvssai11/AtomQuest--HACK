/**
 * @module cycleRepository
 * @description Data access layer for Cycles (performance years/periods).
 */

import store from '../store/inMemoryStore.js';

const cycleRepository = {
  /**
   * Find a cycle by its ID.
   * @param {string} cycleId 
   * @returns {Object|null}
   */
  findById(cycleId) {
    return store.cycles.get(cycleId) ?? null;
  },

  /**
   * Find the currently active cycle.
   * For simplicity in this hackathon, we assume the cycle for the current year
   * is the active one, or we just return the first one (since it's a demo).
   * @returns {Object|null}
   */
  findActiveCycle() {
    // In a real app, cycles might have an isActive boolean flag
    // Here we just return the 2025 seeded cycle
    for (const cycle of store.cycles.values()) {
        return cycle; // Return the first one (we only seed one)
    }
    return null;
  },

  /**
   * Save (create or update) a cycle.
   * @param {Object} cycle 
   * @returns {Object}
   */
  save(cycle) {
    store.cycles.set(cycle.id, cycle);
    return cycle;
  }
};

export default cycleRepository;
