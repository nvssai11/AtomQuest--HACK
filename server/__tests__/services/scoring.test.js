import { jest } from '@jest/globals';
import scoringService from '../../src/services/scoring.js';

describe('ScoringService', () => {
  describe('Numeric Min UoM (Higher is better)', () => {
    it('scores 100% when achievement equals target', () => {
      expect(scoringService.calculateScore('numeric-min', 100, 100)).toBe(100);
    });

    it('scores >100% when achievement exceeds target (capped behavior may apply later, but pure formula is raw)', () => {
      expect(scoringService.calculateScore('numeric-min', 120, 100)).toBe(120);
    });

    it('scores proportionately when achievement is below target', () => {
      expect(scoringService.calculateScore('numeric-min', 80, 100)).toBe(80);
      expect(scoringService.calculateScore('numeric-min', 45, 90)).toBe(50);
    });

    it('handles zero achievement gracefully', () => {
      expect(scoringService.calculateScore('numeric-min', 0, 100)).toBe(0);
    });

    it('handles zero target safely (returns 0 to avoid Infinity)', () => {
      expect(scoringService.calculateScore('numeric-min', 50, 0)).toBe(0);
    });
  });

  describe('Numeric Max UoM (Lower is better)', () => {
    it('scores 100% when achievement equals target', () => {
      expect(scoringService.calculateScore('numeric-max', 10, 10)).toBe(100);
    });

    it('scores proportionately higher when achievement is lower than target', () => {
      // Target: 20 days. Achieved: 10 days. Score: 200%
      expect(scoringService.calculateScore('numeric-max', 10, 20)).toBe(200);
    });

    it('scores proportionately lower when achievement is higher than target', () => {
      // Target: 10 bugs. Achieved: 20 bugs. Score: 50%
      expect(scoringService.calculateScore('numeric-max', 20, 10)).toBe(50);
    });

    it('handles zero achievement perfectly (max score limit applied to avoid Infinity)', () => {
      // Target 10, Achievement 0 -> Formula is 10/0 = Infinity. We cap at 200%.
      expect(scoringService.calculateScore('numeric-max', 0, 10)).toBe(200);
    });
  });

  describe('Timeline UoM', () => {
    it('scores 100% when completed on the deadline', () => {
      expect(scoringService.calculateScore('timeline', '2025-06-30', '2025-06-30')).toBe(100);
    });

    it('scores 100% when completed before the deadline', () => {
      expect(scoringService.calculateScore('timeline', '2025-06-20', '2025-06-30')).toBe(100);
    });

    it('scores 0% when completed after the deadline', () => {
      expect(scoringService.calculateScore('timeline', '2025-07-01', '2025-06-30')).toBe(0);
    });

    it('handles invalid dates safely (returns 0)', () => {
      expect(scoringService.calculateScore('timeline', 'invalid-date', '2025-06-30')).toBe(0);
    });
  });

  describe('Zero UoM', () => {
    it('scores 100% when achievement is 0', () => {
      expect(scoringService.calculateScore('zero', 0, 0)).toBe(100);
    });

    it('scores 0% when achievement is > 0', () => {
      expect(scoringService.calculateScore('zero', 1, 0)).toBe(0);
      expect(scoringService.calculateScore('zero', 5, 0)).toBe(0);
    });
  });

  describe('Invalid UoM', () => {
    it('returns 0 for unknown UoM types', () => {
      expect(scoringService.calculateScore('unknown-uom', 50, 100)).toBe(0);
    });
  });
});
