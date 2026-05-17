import { jest } from '@jest/globals';
import store from '../../src/store/inMemoryStore.js';

const cycleRepositoryMock = {
  findActiveCycle: jest.fn(),
};

jest.unstable_mockModule('../../src/repository/cycleRepository.js', () => ({
  default: cycleRepositoryMock,
}));

const { default: escalationService } = await import('../../src/services/escalation.js');
const { default: cycleRepository } = await import('../../src/repository/cycleRepository.js');

describe('EscalationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.users.clear();
    store.goalSheets.clear();
    store.escalationRules.clear();
    store.escalationLog.length = 0;
    store.orgHierarchy.clear();
  });

  describe('runEscalationEngine', () => {
    it('escalates employees who have not submitted goals past the threshold', () => {
      // Setup cycle opened 10 days ago
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      cycleRepository.findActiveCycle.mockReturnValue({
        id: 'cycle-1',
        activePhase: 'goal-setting',
        phases: {
          'goal-setting': { status: 'active', openDate: tenDaysAgo }
        }
      });

      // Setup rule: escalate after 7 days
      store.escalationRules.set('rule-1', {
        id: 'rule-1',
        triggerType: 'submission-overdue',
        thresholdDays: 7,
        isActive: true
      });

      // Setup user and draft sheet
      store.users.set('usr-1', { id: 'usr-1', name: 'Late Employee', role: 'employee', managerId: 'mgr-1' });
      store.orgHierarchy.set('usr-1', { userId: 'usr-1', managerId: 'mgr-1' });
      store.goalSheets.set('sheet-1', { id: 'sheet-1', employeeId: 'usr-1', cycleId: 'cycle-1', status: 'draft' });

      escalationService.runEscalationEngine();

      expect(store.escalationLog).toHaveLength(1);
      const log = store.escalationLog[0];
      expect(log.triggerType).toBe('submission-overdue');
      expect(log.affectedUserId).toBe('usr-1');
      expect(log.managerId).toBe('mgr-1');
    });

    it('does not escalate if the sheet is already submitted', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      cycleRepository.findActiveCycle.mockReturnValue({
        id: 'cycle-1',
        activePhase: 'goal-setting',
        phases: {
          'goal-setting': { status: 'active', openDate: tenDaysAgo }
        }
      });

      store.escalationRules.set('rule-1', {
        id: 'rule-1',
        triggerType: 'submission-overdue',
        thresholdDays: 7,
        isActive: true
      });

      store.users.set('usr-1', { id: 'usr-1', name: 'Good Employee', role: 'employee' });
      // Status is 'submitted'
      store.goalSheets.set('sheet-1', { id: 'sheet-1', employeeId: 'usr-1', cycleId: 'cycle-1', status: 'submitted' });

      escalationService.runEscalationEngine();

      expect(store.escalationLog).toHaveLength(0);
    });
  });
});
