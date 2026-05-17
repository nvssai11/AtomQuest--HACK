import { jest } from '@jest/globals';
import validationService from '../../src/services/validation.js';
import { AppError } from '../../src/errors/AppError.js';

describe('ValidationService', () => {
  describe('validateGoalTarget', () => {
    it('allows zero-based goals with target 0', () => {
      expect(() => validationService.validateGoalTarget('zero', 0)).not.toThrow();
    });

    it('rejects zero-based goals with non-zero target', () => {
      expect(() => validationService.validateGoalTarget('zero', 1)).toThrow(AppError);
    });

    it('allows percentage targets between 0 and 100 only', () => {
      expect(() => validationService.validateGoalTarget('percent-min', 0)).not.toThrow();
      expect(() => validationService.validateGoalTarget('percent-max', 100)).not.toThrow();
      expect(() => validationService.validateGoalTarget('percent-min', 101)).toThrow(AppError);
    });

    it('requires numeric targets to be greater than 0', () => {
      expect(() => validationService.validateGoalTarget('numeric-min', 1)).not.toThrow();
      expect(() => validationService.validateGoalTarget('numeric-max', 0)).toThrow(AppError);
    });

    it('requires timeline targets to be valid dates', () => {
      expect(() => validationService.validateGoalTarget('timeline', '2026-06-30')).not.toThrow();
      expect(() => validationService.validateGoalTarget('timeline', 'not-a-date')).toThrow(AppError);
    });
  });

  describe('validateGoalSheetForSubmission', () => {
    it('passes a valid sheet that exactly sums to 100% and has <= 8 goals', () => {
      const goals = [
        { id: '1', weightage: 50 },
        { id: '2', weightage: 30 },
        { id: '3', weightage: 20 },
      ];
      expect(() => validationService.validateGoalSheetForSubmission(goals)).not.toThrow();
    });

    it('rejects if there are no goals', () => {
      const goals = [];
      expect(() => validationService.validateGoalSheetForSubmission(goals))
        .toThrow(AppError);
      try { validationService.validateGoalSheetForSubmission(goals); }
      catch (e) { expect(e.message).toContain('at least one goal'); }
    });

    it('rejects if total weightage < 100%', () => {
      const goals = [
        { id: '1', weightage: 50 },
        { id: '2', weightage: 40 },
      ];
      expect(() => validationService.validateGoalSheetForSubmission(goals))
        .toThrow(AppError);
      try { validationService.validateGoalSheetForSubmission(goals); }
      catch (e) { expect(e.message).toContain('must equal exactly 100'); }
    });

    it('rejects if total weightage > 100%', () => {
      const goals = [
        { id: '1', weightage: 50 },
        { id: '2', weightage: 60 },
      ];
      expect(() => validationService.validateGoalSheetForSubmission(goals))
        .toThrow(AppError);
      try { validationService.validateGoalSheetForSubmission(goals); }
      catch (e) { expect(e.message).toContain('must equal exactly 100'); }
    });

    it('rejects if any individual goal is < 10% weightage', () => {
      const goals = [
        { id: '1', weightage: 95 },
        { id: '2', weightage: 5 },
      ];
      expect(() => validationService.validateGoalSheetForSubmission(goals))
        .toThrow(AppError);
      try { validationService.validateGoalSheetForSubmission(goals); }
      catch (e) { expect(e.message).toContain('Minimum weightage per goal is 10%'); }
    });

    it('rejects if there are > 8 goals', () => {
      const goals = Array.from({ length: 9 }).map((_, i) => ({ id: `${i}`, weightage: 12 }));
      expect(() => validationService.validateGoalSheetForSubmission(goals))
        .toThrow(AppError);
      try { validationService.validateGoalSheetForSubmission(goals); }
      catch (e) { expect(e.message).toContain('Maximum 8 goals allowed'); }
    });
  });

  describe('validateGoalAddition', () => {
    it('passes if adding a goal does not exceed max goals', () => {
      const existingGoals = Array.from({ length: 7 }); // 7 existing
      expect(() => validationService.validateGoalAddition(existingGoals)).not.toThrow();
    });

    it('rejects if adding a goal would exceed max 8 goals', () => {
      const existingGoals = Array.from({ length: 8 }); // 8 existing
      expect(() => validationService.validateGoalAddition(existingGoals))
        .toThrow(AppError);
    });
  });

  describe('validateWeightageCapacity', () => {
    it('passes while a draft remains at or below 100%', () => {
      const existingGoals = [
        { id: '1', weightage: 40 },
        { id: '2', weightage: 30 },
      ];

      expect(() => validationService.validateWeightageCapacity(existingGoals, 30)).not.toThrow();
    });

    it('rejects if adding a goal would push total weightage above 100%', () => {
      const existingGoals = [
        { id: '1', weightage: 60 },
        { id: '2', weightage: 40 },
      ];

      expect(() => validationService.validateWeightageCapacity(existingGoals, 10))
        .toThrow(AppError);
    });

    it('uses replacement weightage when editing an existing goal', () => {
      const existingGoals = [
        { id: '1', weightage: 60 },
        { id: '2', weightage: 40 },
      ];

      expect(() => validationService.validateWeightageCapacity(existingGoals, 50, '1')).not.toThrow();
      expect(() => validationService.validateWeightageCapacity(existingGoals, 70, '1'))
        .toThrow(AppError);
    });
  });

  describe('validateSharedGoalEdit', () => {
    it('passes if only weightage is edited', () => {
      const existingGoal = { id: '1', isShared: true, title: 'Old Title', target: 100, weightage: 20 };
      const updates = { weightage: 30 };
      expect(() => validationService.validateSharedGoalEdit(existingGoal, updates)).not.toThrow();
    });

    it('rejects if title or target are edited', () => {
      const existingGoal = { id: '1', isShared: true, title: 'Old Title', target: 100, weightage: 20 };
      const updates = { target: 200 };
      expect(() => validationService.validateSharedGoalEdit(existingGoal, updates))
        .toThrow(AppError);
      try { validationService.validateSharedGoalEdit(existingGoal, updates); }
      catch (e) { expect(e.message).toContain('read-only for shared goals'); }
    });
  });
});
