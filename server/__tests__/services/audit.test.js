import { jest } from '@jest/globals';

// Mock the repository so we can test the service logic in isolation
const auditRepositoryMock = {
  append: jest.fn(),
  findByEntityId: jest.fn(),
};

jest.unstable_mockModule('../../src/repository/auditRepository.js', () => ({
  default: auditRepositoryMock,
}));

const { default: auditService } = await import('../../src/services/audit.js');
const { default: auditRepository } = await import('../../src/repository/auditRepository.js');

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logGoalEdit', () => {
    it('does not log if the new value is the same as the old value', () => {
      auditService.logGoalEdit({
        goalId: 'goal-1',
        field: 'target',
        oldValue: 100,
        newValue: 100, // Same value
        performedBy: { id: 'usr-1', name: 'Maya Iyer' },
        reason: 'Typo fix'
      });

      expect(auditRepository.append).not.toHaveBeenCalled();
    });

    it('creates an audit log entry when value changes', () => {
      const entry = {
        goalId: 'goal-1',
        field: 'target',
        oldValue: 100,
        newValue: 150,
        performedBy: { id: 'usr-1', name: 'Maya Iyer' },
        reason: 'Target increased for Q3'
      };

      auditRepository.append.mockReturnValue({ id: 'audit-1', ...entry, timestamp: new Date().toISOString() });

      const result = auditService.logGoalEdit(entry);

      expect(auditRepository.append).toHaveBeenCalledTimes(1);
      
      const appendedObj = auditRepository.append.mock.calls[0][0];
      expect(appendedObj.entityId).toBe('goal-1');
      expect(appendedObj.entityType).toBe('goal');
      expect(appendedObj.action).toBe('FIELD_UPDATED');
      expect(appendedObj.field).toBe('target');
      expect(appendedObj.oldValue).toBe('100'); // Cast to string
      expect(appendedObj.newValue).toBe('150'); // Cast to string
      expect(appendedObj.performedBy).toBe('usr-1');
      expect(appendedObj.reason).toBe('Target increased for Q3');
      expect(appendedObj).toHaveProperty('timestamp');
    });
  });

  describe('logGoalUnlock', () => {
    it('logs an unlock action', () => {
      auditService.logGoalUnlock('goal-1', { id: 'usr-2', name: 'Admin User' }, 'Needs revision');

      expect(auditRepository.append).toHaveBeenCalledTimes(1);
      const appendedObj = auditRepository.append.mock.calls[0][0];
      
      expect(appendedObj.action).toBe('GOAL_UNLOCKED');
      expect(appendedObj.field).toBe('isLocked');
      expect(appendedObj.oldValue).toBe('true');
      expect(appendedObj.newValue).toBe('false');
      expect(appendedObj.reason).toBe('Needs revision');
    });
  });

  describe('getAuditTrailForGoal', () => {
    it('fetches logs from the repository', () => {
      auditRepository.findByEntityId.mockReturnValue([{ id: 'log-1' }]);
      
      const result = auditService.getAuditTrailForGoal('goal-1');
      
      expect(auditRepository.findByEntityId).toHaveBeenCalledWith('goal-1');
      expect(result).toHaveLength(1);
    });
  });
});
