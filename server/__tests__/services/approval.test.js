import { jest } from '@jest/globals';
import { AppError } from '../../src/errors/AppError.js';

const goalRepositoryMock = {
  findSheetsByEmployeeIds: jest.fn(),
  findGoalsBySheetId: jest.fn(),
  findSheetById: jest.fn(),
  saveGoal: jest.fn(),
  saveSheet: jest.fn(),
};

const userRepositoryMock = {
  findDirectReports: jest.fn(),
  getHierarchy: jest.fn(),
};

const cycleRepositoryMock = {
  findActiveCycle: jest.fn(),
  save: jest.fn(),
};

jest.unstable_mockModule('../../src/repository/goalRepository.js', () => ({
  default: goalRepositoryMock,
}));

jest.unstable_mockModule('../../src/repository/userRepository.js', () => ({
  default: userRepositoryMock,
}));

jest.unstable_mockModule('../../src/repository/cycleRepository.js', () => ({
  default: cycleRepositoryMock,
}));

const { default: approvalService } = await import('../../src/services/approvalService.js');
const { default: goalRepository } = await import('../../src/repository/goalRepository.js');
const { default: userRepository } = await import('../../src/repository/userRepository.js');
const { default: cycleRepository } = await import('../../src/repository/cycleRepository.js');

describe('ApprovalService', () => {
  const managerId = 'mgr-1';
  const employeeId = 'emp-raj';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default active cycle for tests
    cycleRepository.findActiveCycle.mockReturnValue({
      id: 'cycle-2025',
      activePhase: 'approval',
      phases: {
        'goal-setting': { status: 'closed' },
        'approval': { status: 'active' },
      },
    });
  });

  describe('getPendingApprovals', () => {
    it('returns submitted sheets for direct reports with employee metadata', () => {
      userRepository.findDirectReports.mockReturnValue([
        { id: employeeId, name: 'Raj Patel', department: 'Sales' },
      ]);
      goalRepository.findSheetsByEmployeeIds.mockReturnValue([
        {
          id: 'gs-raj',
          employeeId,
          status: 'submitted',
          year: 2025,
          submittedAt: '2025-05-20T10:00:00.000Z',
        },
      ]);

      const result = approvalService.getPendingApprovals(managerId);

      expect(goalRepository.findSheetsByEmployeeIds).toHaveBeenCalledWith(
        [employeeId],
        'submitted'
      );
      expect(result).toHaveLength(1);
      expect(result[0].employeeName).toBe('Raj Patel');
      expect(result[0].employeeDepartment).toBe('Sales');
    });

    it('does not access store through findGoalsBySheetId (regression)', () => {
      userRepository.findDirectReports.mockReturnValue([]);
      goalRepository.findSheetsByEmployeeIds.mockReturnValue([]);

      approvalService.getPendingApprovals(managerId);

      expect(goalRepository.findSheetsByEmployeeIds).toHaveBeenCalled();
      expect(goalRepository.findGoalsBySheetId?.store).toBeUndefined();
    });
  });

  describe('approveSheet', () => {
    it('locks goals and marks sheet approved', () => {
      const sheet = { id: 'gs-1', employeeId, status: 'submitted' };
      const goals = [
        { id: 'g-1', isLocked: false, weightage: 60 },
        { id: 'g-2', isLocked: false, weightage: 40 },
      ];

      goalRepository.findSheetById.mockReturnValue(sheet);
      userRepository.getHierarchy.mockReturnValue({ managerId });
      goalRepository.findGoalsBySheetId.mockReturnValue(goals);
      goalRepository.saveGoal.mockImplementation((g) => g);
      goalRepository.saveSheet.mockImplementation((s) => s);

      const result = approvalService.approveSheet('gs-1', managerId);

      expect(goalRepository.saveGoal).toHaveBeenCalledTimes(2);
      expect(goalRepository.saveGoal.mock.calls[0][0].isLocked).toBe(true);
      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe(managerId);
    });

    it('applies inline target and weightage edits before locking', () => {
      const sheet = { id: 'gs-1', employeeId, status: 'submitted' };
      const goals = [
        { id: 'g-1', target: 100, weightage: 60, isLocked: false },
        { id: 'g-2', target: 80, weightage: 40, isLocked: false },
      ];

      goalRepository.findSheetById.mockReturnValue(sheet);
      userRepository.getHierarchy.mockReturnValue({ managerId });
      goalRepository.findGoalsBySheetId.mockReturnValue(goals);
      goalRepository.saveGoal.mockImplementation((g) => g);
      goalRepository.saveSheet.mockImplementation((s) => s);

      approvalService.approveSheet('gs-1', managerId, [
        { goalId: 'g-1', target: 120, weightage: 50 },
        { goalId: 'g-2', weightage: 50 },
      ]);

      expect(goalRepository.saveGoal.mock.calls[0][0]).toMatchObject({
        id: 'g-1',
        target: 120,
        weightage: 50,
        isLocked: true,
      });
      expect(goalRepository.saveGoal.mock.calls[1][0]).toMatchObject({
        id: 'g-2',
        weightage: 50,
        isLocked: true,
      });
    });

    it('rejects approval when inline edits do not total 100%', () => {
      const sheet = { id: 'gs-1', employeeId, status: 'submitted' };
      const goals = [
        { id: 'g-1', target: 100, weightage: 60, isLocked: false },
        { id: 'g-2', target: 80, weightage: 40, isLocked: false },
      ];

      goalRepository.findSheetById.mockReturnValue(sheet);
      userRepository.getHierarchy.mockReturnValue({ managerId });
      goalRepository.findGoalsBySheetId.mockReturnValue(goals);

      expect(() => approvalService.approveSheet('gs-1', managerId, [
        { goalId: 'g-1', weightage: 40 },
      ])).toThrow(AppError);
      expect(goalRepository.saveGoal).not.toHaveBeenCalled();
    });

    it('rejects when sheet is not submitted', () => {
      goalRepository.findSheetById.mockReturnValue({
        id: 'gs-1',
        employeeId,
        status: 'draft',
      });
      userRepository.getHierarchy.mockReturnValue({ managerId });

      expect(() => approvalService.approveSheet('gs-1', managerId)).toThrow(AppError);
    });

    it('rejects when active cycle phase is not approval', () => {
      cycleRepository.findActiveCycle.mockReturnValue({
        id: 'cycle-2025',
        activePhase: 'goal-setting',
      });
      goalRepository.findSheetById.mockReturnValue({
        id: 'gs-1',
        employeeId,
        status: 'submitted',
      });
      userRepository.getHierarchy.mockReturnValue({ managerId });

      expect(() => approvalService.approveSheet('gs-1', managerId)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Cannot approve goals outside approval phase')
        })
      );
    });
  });
});
