import { jest } from '@jest/globals';
import reportsService from '../../src/services/reportsService.js';
import store from '../../src/store/inMemoryStore.js';

describe('ReportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.users.clear();
    store.goals.clear();
    store.goalSheets.clear();
    store.checkIns.clear();
  });

  describe('generateAchievementReport', () => {
    it('generates an array of flattened objects suitable for CSV export', () => {
      // Mock Data Setup
      store.users.set('usr-1', { id: 'usr-1', name: 'Sarah', department: 'Sales' });
      store.goalSheets.set('sheet-1', { id: 'sheet-1', employeeId: 'usr-1', status: 'approved' });
      store.goals.set('goal-1', {
        id: 'goal-1',
        goalSheetId: 'sheet-1',
        employeeId: 'usr-1',
        title: 'Sell 100 widgets',
        target: 100,
        uom: 'numeric-min',
        weightage: 100
      });

      store.checkIns.set('ci-1', {
        id: 'ci-1',
        goalSheetId: 'sheet-1',
        employeeId: 'usr-1',
        quarter: 'Q1',
        entries: [
          { goalId: 'goal-1', actualAchievement: 85, computedScore: 85, status: 'on-track' }
        ]
      });

      const report = reportsService.generateAchievementReport('Q1');

      expect(report).toHaveLength(1);
      const row = report[0];
      expect(row.EmployeeName).toBe('Sarah');
      expect(row.Department).toBe('Sales');
      expect(row.GoalTitle).toBe('Sell 100 widgets');
      expect(row.Target).toBe(100);
      expect(row.ActualAchievement).toBe(85);
      expect(row.ComputedScore).toBe(85);
      expect(row.Status).toBe('on-track');
    });

    it('returns empty array if no check-ins found for the quarter', () => {
      const report = reportsService.generateAchievementReport('Q2');
      expect(report).toHaveLength(0);
    });
  });

  describe('exportToCSV', () => {
    it('converts an array of objects to a CSV string', () => {
      const data = [
        { Name: 'Sarah', Score: 85 },
        { Name: 'Raj', Score: 90 }
      ];

      const csv = reportsService.exportToCSV(data);
      expect(csv).toContain('Name,Score');
      expect(csv).toContain('"Sarah",85');
      expect(csv).toContain('"Raj",90');
    });

    it('returns empty string if no data', () => {
      expect(reportsService.exportToCSV([])).toBe('');
    });
  });
});
