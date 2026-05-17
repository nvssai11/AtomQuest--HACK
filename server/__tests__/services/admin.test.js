import { jest } from '@jest/globals';
import store from '../../src/store/inMemoryStore.js';
import { AppError } from '../../src/errors/AppError.js';

const goalRepositoryMock = {
  findGoalById: jest.fn(),
  saveGoal: jest.fn(),
};

const cycleRepositoryMock = {
  findActiveCycle: jest.fn(),
  save: jest.fn(),
};

const auditServiceMock = {
  logGoalUnlock: jest.fn(),
};

jest.unstable_mockModule('../../src/repository/goalRepository.js', () => ({
  default: goalRepositoryMock,
}));

jest.unstable_mockModule('../../src/repository/cycleRepository.js', () => ({
  default: cycleRepositoryMock,
}));

jest.unstable_mockModule('../../src/services/audit.js', () => ({
  default: auditServiceMock,
}));

const { default: adminService } = await import('../../src/services/adminService.js');
const { default: goalRepository } = await import('../../src/repository/goalRepository.js');
const { default: cycleRepository } = await import('../../src/repository/cycleRepository.js');
const { default: auditService } = await import('../../src/services/audit.js');

describe('AdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAdmin = { id: 'usr-admin', name: 'Admin', role: 'admin' };

  describe('unlockGoal', () => {
    it('unlocks the goal and logs the action', () => {
      goalRepository.findGoalById.mockReturnValue({ id: 'goal-1', isLocked: true });
      goalRepository.saveGoal.mockImplementation(g => g);

      const result = adminService.unlockGoal('goal-1', 'Needs target revision', mockAdmin);

      expect(auditService.logGoalUnlock).toHaveBeenCalledWith('goal-1', mockAdmin, 'Needs target revision');
      expect(goalRepository.saveGoal).toHaveBeenCalled();
      expect(result.isLocked).toBe(false);
    });

    it('throws error if goal not found', () => {
      goalRepository.findGoalById.mockReturnValue(null);

      expect(() => adminService.unlockGoal('goal-1', 'Reason', mockAdmin))
        .toThrow(AppError);
    });
  });

  describe('updateCyclePhase', () => {
    it('updates the active phase of the current cycle', () => {
      const mockCycle = {
        id: 'cycle-1',
        activePhase: 'Q1',
        phases: {
          'Q1': { status: 'active' },
          'Q2': { status: 'upcoming' }
        }
      };
      cycleRepository.findActiveCycle.mockReturnValue(mockCycle);
      cycleRepository.save.mockImplementation(c => c);

      const result = adminService.updateCyclePhase('Q2');

      expect(cycleRepository.save).toHaveBeenCalled();
      expect(result.activePhase).toBe('Q2');
      expect(result.phases['Q1'].status).toBe('closed');
      expect(result.phases['Q2'].status).toBe('active');
    });
  });
});
