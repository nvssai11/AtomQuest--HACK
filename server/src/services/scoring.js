/**
 * @module scoring
 * @description Pure function service for computing achievement scores based on UoM.
 * 
 * "Pure functions are easier to reason about and test" — Clean Code.
 * This service has no dependencies on the data store or express request objects.
 */

const scoringService = {
  /**
   * Calculates the achievement score percentage based on the Unit of Measurement formula.
   * 
   * @param {string} uom 'numeric-min', 'numeric-max', 'percent-min', 'percent-max', 'timeline', 'zero'
   * @param {number|string} achievement The actual achievement (number or ISO date string)
   * @param {number|string} target The planned target (number or ISO date string)
   * @returns {number} Score percentage (0 to 200)
   */
  calculateScore(uom, achievement, target) {
    if (achievement === null || achievement === undefined) return 0;

    switch (uom) {
      case 'numeric-min':
      case 'percent-min': {
        // Higher is better: (Achievement / Target) * 100
        const ach = Number(achievement);
        const tgt = Number(target);
        if (tgt === 0) return 0; // Avoid division by zero
        return Math.round((ach / tgt) * 100);
      }

      case 'numeric-max':
      case 'percent-max': {
        // Lower is better: (Target / Achievement) * 100
        const ach = Number(achievement);
        const tgt = Number(target);
        if (ach === 0) return 200; // Perfect score if achievement is 0 (capped at 200%)
        return Math.round((tgt / ach) * 100);
      }

      case 'timeline': {
        // Date-based: 100% if completed on/before deadline, else 0%
        const achDate = new Date(achievement).getTime();
        const tgtDate = new Date(target).getTime();
        if (Number.isNaN(achDate) || Number.isNaN(tgtDate)) return 0;
        return achDate <= tgtDate ? 100 : 0;
      }

      case 'zero': {
        // Success is strictly exactly zero
        return Number(achievement) === 0 ? 100 : 0;
      }

      default:
        return 0;
    }
  }
};

export default scoringService;
