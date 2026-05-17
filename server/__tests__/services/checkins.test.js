import { jest } from '@jest/globals';
import { AppError } from '../../src/errors/AppError.js';

const checkinRepositoryMock = {
  findByEmployeeCycleAndQuarter: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
};

const goalRepositoryMock = {
  findSheetByEmployeeAndCycle: jest.fn(),
  findGoalById: jest.fn(),
  findSharedLinksByMaster: jest.fn(),
};

const cycleRepositoryMock = {
  findActiveCycle: jest.fn(),
};

const userRepositoryMock = {
  findById: jest.fn(),
};

const checkinWindowServiceMock = {
  validateCheckinWindow: jest.fn(),
};

const scoringServiceMock = {
  calculateScore: jest.fn(),
};

jest.unstable_mockModule('../../src/repository/checkinRepository.js', () => ({
  default: checkinRepositoryMock,
}));

jest.unstable_mockModule('../../src/repository/goalRepository.js', () => ({
  default: goalRepositoryMock,
}));

jest.unstable_mockModule('../../src/repository/cycleRepository.js', () => ({
  default: cycleRepositoryMock,
}));

jest.unstable_mockModule('../../src/repository/userRepository.js', () => ({
  default: userRepositoryMock,
}));

jest.unstable_mockModule('../../src/services/checkinWindow.js', () => ({
  default: checkinWindowServiceMock,
}));

jest.unstable_mockModule('../../src/services/scoring.js', () => ({
  default: scoringServiceMock,
}));

const { default: checkinsService } = await import('../../src/services/checkinsService.js');
const { default: checkinRepository } = await import('../../src/repository/checkinRepository.js');
const { default: goalRepository } = await import('../../src/repository/goalRepository.js');
const { default: cycleRepository } = await import('../../src/repository/cycleRepository.js');
const { default: userRepository } = await import('../../src/repository/userRepository.js');
const { default: checkinWindowService } = await import('../../src/services/checkinWindow.js');
const { default: scoringService } = await import('../../src/services/scoring.js');

describe('CheckinsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cycleRepository.findActiveCycle.mockReturnValue({ id: 'cycle-1' });
    checkinRepository.findByEmployeeCycleAndQuarter.mockReturnValue(null);
    goalRepository.findSharedLinksByMaster.mockReturnValue([]);
    userRepository.findById.mockReturnValue({ id: 'usr-1', managerId: 'usr-2' });
  });

  const mockEmployee = { id: 'usr-1', role: 'employee' };
  const mockManager = { id: 'usr-2', role: 'manager' };

  describe('submitCheckIn', () => {
    it('validates window, saves checkin, and calculates scores', () => {
      checkinWindowService.validateCheckinWindow.mockImplementation(() => {}); // Pass
      goalRepository.findSheetByEmployeeAndCycle.mockReturnValue({ id: 'sheet-1', cycleId: 'cycle-1', status: 'approved' });
      goalRepository.findGoalById.mockReturnValue({ id: 'goal-1', goalSheetId: 'sheet-1', uom: 'numeric-min', target: 100 });
      scoringService.calculateScore.mockReturnValue(80);
      checkinRepository.save.mockImplementation(c => c);

      const payload = {
        quarter: 'Q1',
        entries: [
          { goalId: 'goal-1', actualAchievement: 80, status: 'on-track' }
        ]
      };

      const result = checkinsService.submitCheckIn(mockEmployee, payload);

      expect(checkinWindowService.validateCheckinWindow).toHaveBeenCalledWith('Q1');
      expect(scoringService.calculateScore).toHaveBeenCalledWith('numeric-min', 80, 100);
      expect(checkinRepository.save).toHaveBeenCalled();
      expect(result.quarter).toBe('Q1');
      expect(result.entries[0].computedScore).toBe(80);
    });

    it('rejects if sheet is not approved', () => {
      checkinWindowService.validateCheckinWindow.mockImplementation(() => {}); // Pass
      goalRepository.findSheetByEmployeeAndCycle.mockReturnValue({ id: 'sheet-1', status: 'draft' });

      expect(() => checkinsService.submitCheckIn(mockEmployee, { quarter: 'Q1', entries: [] }))
        .toThrow(AppError);
    });
  });

  describe('addManagerComment', () => {
    it('saves the manager comment', () => {
      const existingCheckIn = { id: 'ci-1', employeeId: 'usr-1' };
      checkinRepository.findById.mockReturnValue(existingCheckIn);
      checkinRepository.save.mockImplementation(c => c);

      const result = checkinsService.addManagerComment('ci-1', 'Good progress', mockManager);

      expect(checkinRepository.save).toHaveBeenCalled();
      expect(result.managerComment).toBe('Good progress');
      expect(result.commentBy).toBe('usr-2');
    });
  });
});
