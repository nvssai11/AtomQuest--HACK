import { jest } from '@jest/globals';
import { AppError } from '../../src/errors/AppError.js';

const cycleRepositoryMock = {
  findActiveCycle: jest.fn(),
};

jest.unstable_mockModule('../../src/repository/cycleRepository.js', () => ({
  default: cycleRepositoryMock,
}));

const { default: checkinWindowService } = await import('../../src/services/checkinWindow.js');
const { default: cycleRepository } = await import('../../src/repository/cycleRepository.js');

describe('CheckinWindowService', () => {
  const mockCycle = {
    id: 'cycle-1',
    activePhase: 'Q1',
    phases: {
      'goal-setting': { status: 'closed' },
      'Q1': { status: 'active' },
      'Q2': { status: 'upcoming' },
      'Q3': { status: 'upcoming' },
      'Q4': { status: 'upcoming' },
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cycleRepository.findActiveCycle.mockReturnValue(mockCycle);
  });

  describe('validateCheckinWindow', () => {
    it('passes when submitting for the currently active phase', () => {
      expect(() => checkinWindowService.validateCheckinWindow('Q1')).not.toThrow();
    });

    it('rejects when submitting for a closed or upcoming phase', () => {
      expect(() => checkinWindowService.validateCheckinWindow('Q2'))
        .toThrow(AppError);
      
      try { checkinWindowService.validateCheckinWindow('Q2'); }
      catch (e) { 
        expect(e.statusCode).toBe(403);
        expect(e.code).toBe('WINDOW_CLOSED');
        expect(e.message).toContain('Q2 check-in window is not currently open');
      }
    });

    it('rejects if no active cycle is found', () => {
      cycleRepository.findActiveCycle.mockReturnValue(null);
      
      expect(() => checkinWindowService.validateCheckinWindow('Q1'))
        .toThrow(AppError);
    });
  });

  describe('getActiveQuarter', () => {
    it('returns the active quarter string if it is a check-in phase', () => {
      expect(checkinWindowService.getActiveQuarter()).toBe('Q1');
    });

    it('returns null if the active phase is goal-setting', () => {
      cycleRepository.findActiveCycle.mockReturnValue({
        ...mockCycle,
        activePhase: 'goal-setting'
      });
      expect(checkinWindowService.getActiveQuarter()).toBeNull();
    });
  });
});
