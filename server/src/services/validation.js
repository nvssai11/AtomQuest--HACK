/**
 * @module validationService
 * @description Centralized business rule validation for Goal Setting.
 * 
 * Extracts complex BRD validation rules away from the route controllers.
 * Throws domain-specific AppError instances if rules are violated.
 */

import { AppError } from '../errors/AppError.js';

const validationService = {
  /**
   * Validates target shape/range for the selected UoM.
   *
   * @param {string} uom
   * @param {number|string} target
   */
  validateGoalTarget(uom, target) {
    if (uom === 'timeline') {
      const targetDate = new Date(target).getTime();
      if (!target || Number.isNaN(targetDate)) {
        throw AppError.unprocessable('Timeline target must be a valid date.');
      }
      return;
    }

    const numericTarget = Number(target);
    if (Number.isNaN(numericTarget)) {
      throw AppError.unprocessable('Target must be a valid number.');
    }

    if (uom === 'zero') {
      if (numericTarget !== 0) {
        throw AppError.unprocessable('Zero-based goals must have a target of 0.');
      }
      return;
    }

    if (uom === 'percent-min' || uom === 'percent-max') {
      if (numericTarget < 0 || numericTarget > 100) {
        throw AppError.unprocessable('Percentage target must be between 0 and 100.');
      }
      return;
    }

    if (numericTarget <= 0) {
      throw AppError.unprocessable('Numeric target must be greater than 0.');
    }
  },

  /**
   * Validates a collection of goals before allowing submission to the manager.
   * BRD Rules:
   * - Total weightage must equal 100% exactly
   * - Minimum weightage per goal is 10%
   * - Maximum 8 goals allowed
   * 
   * @param {Object[]} goals 
   * @throws {AppError} If any validation rule fails
   */
  validateGoalSheetForSubmission(goals) {
    if (!goals || goals.length === 0) {
      throw AppError.unprocessable('Goal sheet must contain at least one goal to submit.');
    }

    if (goals.length > 8) {
      throw AppError.unprocessable(`Maximum 8 goals allowed. Currently have ${goals.length}.`);
    }

    let totalWeightage = 0;
    for (const goal of goals) {
      if (goal.weightage < 10) {
        throw AppError.unprocessable(`Minimum weightage per goal is 10%. Check goal: "${goal.title || goal.id}"`);
      }
      totalWeightage += goal.weightage;
    }

    if (totalWeightage !== 100) {
      throw AppError.unprocessable(`Total weightage must equal exactly 100%. Current total is ${totalWeightage}%.`);
    }
  },

  /**
   * Validates if a new goal can be added to the sheet.
   * @param {Object[]} existingGoals 
   */
  validateGoalAddition(existingGoals) {
    if (existingGoals && existingGoals.length >= 8) {
      throw AppError.unprocessable('Maximum 8 goals allowed per employee.');
    }
  },

  /**
   * Validates that a create/update operation will not push a sheet above 100%.
   * Submission still requires exactly 100%; drafts may stay below 100 while the
   * employee is building the sheet.
   *
   * @param {Object[]} existingGoals
   * @param {number} nextWeightage
   * @param {string|null} [goalIdToReplace]
   */
  validateWeightageCapacity(existingGoals, nextWeightage, goalIdToReplace = null) {
    const totalWeightage = (existingGoals || []).reduce((sum, goal) => {
      if (goalIdToReplace && goal.id === goalIdToReplace) return sum;
      return sum + Number(goal.weightage || 0);
    }, 0);
    const nextTotal = totalWeightage + Number(nextWeightage || 0);

    if (nextTotal > 100) {
      throw AppError.unprocessable(
        `Total weightage cannot exceed 100%. This change would make it ${nextTotal}%.`
      );
    }
  },

  /**
   * Ensures that shared goals are not improperly modified by recipients.
   * BRD Rule: Recipients may adjust weightage only; Goal Title and Target are read-only.
   * @param {Object} existingGoal 
   * @param {Object} updates 
   */
  validateSharedGoalEdit(existingGoal, updates) {
    if (!existingGoal.isShared) return;

    // Check if any restricted fields are in the updates payload
    const restrictedFields = ['title', 'description', 'thrustArea', 'uom', 'target'];
    
    for (const field of restrictedFields) {
      if (updates[field] !== undefined && updates[field] !== existingGoal[field]) {
        throw AppError.forbidden(`Field '${field}' is read-only for shared goals.`);
      }
    }
  }
};

export default validationService;

class WeightageValidator {
    static TOLERANCE = 0.001; // Acceptable margin for floating-point errors
    static MIN_WEIGHTAGE = 10; // Minimum weightage per goal
    static MAX_GOALS = 8; // Maximum number of goals per employee

    /**
     * Checks if the sum of weightages is close enough to 100, considering tolerance.
     * @param {number[]} weightages
     * @returns {boolean}
     */
    static isSumValid(weightages) {
        const sum = weightages.reduce((acc, w) => acc + w, 0);
        return Math.abs(sum - 100) <= WeightageValidator.TOLERANCE;
    }

    /**
     * Normalizes weightages to two decimal places.
     * @param {number[]} weightages
     * @returns {number[]}
     */
    static normalize(weightages) {
        return weightages.map(w => Math.round(w * 100) / 100);
    }

    /**
     * Checks if each weightage is within valid bounds (MIN_WEIGHTAGE <= w <= 100).
     * @param {number[]} weightages
     * @returns {boolean}
     */
    static areIndividualValid(weightages) {
        return weightages.every(w => w >= WeightageValidator.MIN_WEIGHTAGE && w <= 100);
    }

    /**
     * Checks if the number of goals does not exceed MAX_GOALS.
     * @param {number} goalCount
     * @returns {boolean}
     */
    static isGoalCountValid(goalCount) {
        return goalCount <= WeightageValidator.MAX_GOALS;
    }
}

// Refactor validateWeightageCapacity to use WeightageValidator
function validateWeightageCapacity(goalSheet) {
    const weightages = goalSheet.goals.map(goal => goal.weightage);
    const goalCount = goalSheet.goals.length;

    // Check max goals
    if (!WeightageValidator.isGoalCountValid(goalCount)) {
        throw new AppError('Maximum number of goals per employee is 8.', 400);
    }

    // Normalize weightages for precision
    const normalizedWeightages = WeightageValidator.normalize(weightages);

    // Check individual weightages
    if (!WeightageValidator.areIndividualValid(normalizedWeightages)) {
        throw new AppError('Each goal weightage must be between 10 and 100.', 400);
    }

    // Check sum with tolerance
    if (!WeightageValidator.isSumValid(normalizedWeightages)) {
        throw new AppError('Total weightage must sum to 100 (±0.001 tolerance).', 400);
    }
}