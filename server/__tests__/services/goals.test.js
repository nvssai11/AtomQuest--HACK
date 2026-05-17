import { jest } from '@jest/globals';
import { AppError } from '../../src/errors/AppError.js';

const goalRepositoryMock = {
  findGoalById: jest.fn(),
  findSheetById: jest.fn(),
  findGoalsBySheetId: jest.fn(),
  saveGoal: jest.fn(),
  saveSheet: jest.fn(),
  deleteGoal: jest.fn(),
  findSheetByEmployeeAndCycle: jest.fn(),
  findSharedLinksByMaster: jest.fn(),
  saveSharedLink: jest.fn(),
};

const cycleRepositoryMock = {
  findActiveCycle: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
};

const validationServiceMock = {
  validateGoalSheetForSubmission: jest.fn(),
  validateGoalAddition: jest.fn(),
  validateWeightageCapacity: jest.fn(),
  validateGoalTarget: jest.fn(),
  validateSharedGoalEdit: jest.fn(),
};

const auditServiceMock = {
  logGoalEdit: jest.fn(),
};

const userRepositoryMock = {
  findById: jest.fn(),
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

jest.unstable_mockModule('../../src/services/validation.js', () => ({
  default: validationServiceMock,
}));

jest.unstable_mockModule('../../src/services/audit.js', () => ({
  default: auditServiceMock,
}));

const { default: goalsService } = await import('../../src/services/goalsService.js');
const { default: goalRepository } = await import('../../src/repository/goalRepository.js');
const { default: cycleRepository } = await import('../../src/repository/cycleRepository.js');
const { default: validationService } = await import('../../src/services/validation.js');
const { default: auditService } = await import('../../src/services/audit.js');

describe('GoalsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEmployee = { id: 'usr-1', role: 'employee' };
  const mockCycle = { id: 'cycle-1' };
  const mockSheet = { id: 'sheet-1', status: 'draft', employeeId: 'usr-1' };
  
  describe('createGoal', () => {
    it('creates a goal and goal sheet if it does not exist', () => {
      cycleRepository.findActiveCycle.mockReturnValue(mockCycle);
      goalRepository.findSheetByEmployeeAndCycle.mockReturnValue(null); // No sheet yet
      goalRepository.findGoalsBySheetId.mockReturnValue([]);
      goalRepository.saveSheet.mockImplementation(s => s);
      goalRepository.saveGoal.mockImplementation(g => g);

      const payload = { title: 'New Goal', uom: 'numeric-min', target: 10, weightage: 20 };
      const result = goalsService.createGoal(mockEmployee, payload);

      expect(goalRepository.saveSheet).toHaveBeenCalled();
      expect(validationService.validateWeightageCapacity).toHaveBeenCalledWith([], 20);
      expect(validationService.validateGoalTarget).toHaveBeenCalledWith('numeric-min', 10);
      expect(goalRepository.saveGoal).toHaveBeenCalled();
      expect(result.goal.title).toBe('New Goal');
      expect(result.sheet.status).toBe('draft');
    });

    it('validates against max goals rule before adding', () => {
      cycleRepository.findActiveCycle.mockReturnValue(mockCycle);
      goalRepository.findSheetByEmployeeAndCycle.mockReturnValue(mockSheet);
      const existingGoals = Array(8).fill({});
      goalRepository.findGoalsBySheetId.mockReturnValue(existingGoals);

      // We expect validationService to throw if it exceeds
      validationService.validateGoalAddition.mockImplementation(() => {
        throw new Error('Max goals exceeded');
      });

      expect(() => goalsService.createGoal(mockEmployee, {}))
        .toThrow('Max goals exceeded');
    });
  });

  describe('updateGoal', () => {
    it('allows edit and logs audit trail if sheet is approved', () => {
      const mockGoal = { id: 'goal-1', title: 'Old Title', goalSheetId: 'sheet-1', isLocked: true };
      const approvedSheet = { id: 'sheet-1', status: 'approved' };
      
      goalRepository.findGoalById.mockReturnValue(mockGoal);
      goalRepository.findSheetById.mockReturnValue(approvedSheet);
      goalRepository.saveGoal.mockImplementation(g => g);

      const updates = { title: 'New Title' };
      const result = goalsService.updateGoal('goal-1', updates, { id: 'admin-1', role: 'admin' });

      expect(auditService.logGoalEdit).toHaveBeenCalled();
      expect(goalRepository.saveGoal).toHaveBeenCalled();
      expect(result.title).toBe('New Title');
    });

    it('rejects edit by employee if goal is locked', () => {
      const mockGoal = { id: 'goal-1', goalSheetId: 'sheet-1', isLocked: true };
      const approvedSheet = { id: 'sheet-1', status: 'approved' };
      
      goalRepository.findGoalById.mockReturnValue(mockGoal);
      goalRepository.findSheetById.mockReturnValue(approvedSheet);

      expect(() => goalsService.updateGoal('goal-1', { title: 'New' }, mockEmployee))
        .toThrow(AppError);
    });

    it('rejects locked goal edit by manager after approval', () => {
      const mockGoal = { id: 'goal-1', goalSheetId: 'sheet-1', employeeId: 'usr-1', isLocked: true };
      const approvedSheet = { id: 'sheet-1', status: 'approved', employeeId: 'usr-1' };

      goalRepository.findGoalById.mockReturnValue(mockGoal);
      goalRepository.findSheetById.mockReturnValue(approvedSheet);
      userRepositoryMock.findById.mockReturnValue({ id: 'usr-1', managerId: 'mgr-1' });

      expect(() => goalsService.updateGoal('goal-1', { target: 120 }, { id: 'mgr-1', role: 'manager' }))
        .toThrow(AppError);
    });

    it('allows manager approval edits only for target and weightage', () => {
      const mockGoal = { id: 'goal-1', title: 'Old Title', goalSheetId: 'sheet-1', employeeId: 'usr-1', isLocked: false };
      const submittedSheet = { id: 'sheet-1', status: 'submitted', employeeId: 'usr-1' };

      goalRepository.findGoalById.mockReturnValue(mockGoal);
      goalRepository.findSheetById.mockReturnValue(submittedSheet);
      userRepositoryMock.findById.mockReturnValue({ id: 'usr-1', managerId: 'mgr-1' });

      expect(() => goalsService.updateGoal('goal-1', { title: 'New Title' }, { id: 'mgr-1', role: 'manager' }))
        .toThrow(AppError);
    });

    it('rejects employee edits after submission even before approval lock', () => {
      const mockGoal = { id: 'goal-1', goalSheetId: 'sheet-1', employeeId: 'usr-1', isLocked: false };
      const submittedSheet = { id: 'sheet-1', status: 'submitted', employeeId: 'usr-1' };

      goalRepository.findGoalById.mockReturnValue(mockGoal);
      goalRepository.findSheetById.mockReturnValue(submittedSheet);

      expect(() => goalsService.updateGoal('goal-1', { weightage: 50 }, mockEmployee))
        .toThrow(AppError);
      expect(goalRepository.saveGoal).not.toHaveBeenCalled();
    });

    it('validates sheet weightage capacity when weightage changes', () => {
      const mockGoal = { id: 'goal-1', goalSheetId: 'sheet-1', employeeId: 'usr-1', isLocked: false, weightage: 40 };
      const draftSheet = { id: 'sheet-1', status: 'draft', employeeId: 'usr-1' };
      const sheetGoals = [
        mockGoal,
        { id: 'goal-2', goalSheetId: 'sheet-1', employeeId: 'usr-1', weightage: 50 },
      ];

      goalRepository.findGoalById.mockReturnValue(mockGoal);
      goalRepository.findSheetById.mockReturnValue(draftSheet);
      goalRepository.findGoalsBySheetId.mockReturnValue(sheetGoals);
      goalRepository.saveGoal.mockImplementation(g => g);

      goalsService.updateGoal('goal-1', { weightage: 50 }, mockEmployee);

      expect(validationService.validateWeightageCapacity).toHaveBeenCalledWith(sheetGoals, 50, 'goal-1');
    });
  });

  describe('submitGoalSheet', () => {
    it('changes sheet status to submitted', () => {
      goalRepository.findSheetById.mockReturnValue(mockSheet);
      goalRepository.findGoalsBySheetId.mockReturnValue([{ weightage: 100 }]);
      goalRepository.saveSheet.mockImplementation(s => s);

      const result = goalsService.submitGoalSheet('sheet-1', mockEmployee);

      expect(validationService.validateGoalSheetForSubmission).toHaveBeenCalled();
      expect(goalRepository.saveSheet).toHaveBeenCalled();
      expect(result.status).toBe('submitted');
    });
  });

  describe('deleteGoal', () => {
    it('throws forbidden error if user is not the owner of the goal', () => {
      const mockGoal = { id: 'goal-1', goalSheetId: 'sheet-1', employeeId: 'usr-2' };
      goalRepository.findGoalById.mockReturnValue(mockGoal);

      expect(() => goalsService.deleteGoal('goal-1', mockEmployee))
        .toThrow(AppError);
    });

    it('deletes the goal if user is the owner', () => {
      const mockGoal = { id: 'goal-1', goalSheetId: 'sheet-1', employeeId: 'usr-1' };
      goalRepository.findGoalById.mockReturnValue(mockGoal);
      goalRepository.findSheetById.mockReturnValue(mockSheet);
      goalRepository.deleteGoal.mockImplementation(() => {});

      expect(() => goalsService.deleteGoal('goal-1', mockEmployee)).not.toThrow();
      expect(goalRepository.deleteGoal).toHaveBeenCalledWith('goal-1');
    });

    it('rejects employee delete after submission even before approval lock', () => {
      const mockGoal = { id: 'goal-1', goalSheetId: 'sheet-1', employeeId: 'usr-1', isLocked: false };
      goalRepository.findGoalById.mockReturnValue(mockGoal);
      goalRepository.findSheetById.mockReturnValue({ ...mockSheet, status: 'submitted' });

      expect(() => goalsService.deleteGoal('goal-1', mockEmployee))
        .toThrow(AppError);
      expect(goalRepository.deleteGoal).not.toHaveBeenCalled();
    });
  });
});