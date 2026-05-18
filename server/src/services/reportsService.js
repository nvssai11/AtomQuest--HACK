/**
 * @module reportsService
 * @description Generates data exports and dashboards for Admin users.
 */

import store from '../store/inMemoryStore.js';

const reportsService = {
  /**
   * Generates a flattened array of data representing achievement vs target
   * for a given quarter across all employees.
   * 
   * @param {string} quarter 'Q1', 'Q2', etc.
   * @returns {Object[]}
   */
  generateAchievementReport(quarter) {
    const reportData = [];

    // Iterate through all check-ins for the specified quarter
    for (const checkIn of store.checkIns.values()) {
      if (checkIn.quarter !== quarter) continue;

      const user = store.users.get(checkIn.employeeId);
      if (!user) continue;

      // Each goal entry in the check-in becomes a row in the report
      for (const entry of checkIn.entries) {
        const goal = store.goals.get(entry.goalId);
        if (!goal) continue;

        reportData.push({
          EmployeeName: user.name,
          Department: user.department || 'N/A',
          ThrustArea: goal.thrustArea,
          GoalTitle: goal.title,
          UoM: goal.uom,
          Weightage: goal.weightage,
          Target: goal.target,
          ActualAchievement: entry.actualAchievement,
          ComputedScore: entry.computedScore,
          Status: entry.status,
          ManagerComment: checkIn.managerComment || ''
        });
      }
    }

    // Sort by department, then employee name
    return reportData.sort((a, b) => {
      if (a.Department !== b.Department) return a.Department.localeCompare(b.Department);
      return a.EmployeeName.localeCompare(b.EmployeeName);
    });
  },

  /**
   * Converts an array of objects to a CSV string.
   * Note: For the hackathon we implement a simple string builder.
   * In a real app we might use a library like 'csv-stringify'.
   * 
   * @param {Object[]} data 
   * @returns {string}
   */
  exportToCSV(data) {
    // Define canonical column headers always — even when there is no data
    const headers = data && data.length > 0
      ? Object.keys(data[0])
      : ['EmployeeName','Department','ThrustArea','GoalTitle','UoM','Weightage','Target','ActualAchievement','ComputedScore','Status','ManagerComment'];

    // Header row
    const csvRows = [headers.join(',')];

    // Data rows (skipped gracefully if data is empty)
    for (const row of (data || [])) {
      const values = headers.map(header => {
        const val = row[header];
        if (typeof val === 'string') {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  },

  /**
   * Generates the Completion Dashboard data (who has submitted checkins).
   */
  getCompletionDashboard(cycleId, quarter) {
    const totalEmployees = Array.from(store.users.values()).filter(u => u.role === 'employee');
    
    const submittedEmployeeIds = Array.from(store.checkIns.values())
      .filter(ci => ci.cycleId === cycleId && ci.quarter === quarter)
      .map(ci => ci.employeeId);

    const pendingEmployees = totalEmployees.filter(emp => !submittedEmployeeIds.includes(emp.id));

    return {
      totalCount: totalEmployees.length,
      submittedCount: submittedEmployeeIds.length,
      pendingCount: pendingEmployees.length,
      completionRate: totalEmployees.length ? Math.round((submittedEmployeeIds.length / totalEmployees.length) * 100) : 0,
      pendingEmployees: pendingEmployees.map(e => ({ id: e.id, name: e.name, department: e.department }))
    };
  }
};

export default reportsService;
