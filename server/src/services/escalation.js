/**
 * @module escalationService
 * @description Rule-based escalation engine (submission, approval, check-in overdue).
 */

import { v4 as uuidv4 } from 'uuid';
import store from '../store/inMemoryStore.js';
import cycleRepository from '../repository/cycleRepository.js';
import userRepository from '../repository/userRepository.js';

function logEscalation(rule, user, notes, openEscalations) {
  const key = `${rule.id}:${user.id}`;
  if (openEscalations.has(key)) return false;

  store.escalationLog.push({
    id: uuidv4(),
    ruleId: rule.id,
    triggerType: rule.triggerType,
    affectedUserId: user.id,
    affectedUserName: user.name,
    managerId: user.managerId ?? null,
    status: 'open',
    escalatedAt: new Date().toISOString(),
    resolvedAt: null,
    notes,
  });

  // Track the open escalation in the local set to prevent duplicate logs
  openEscalations.add(key);
  return true;
}

const escalationService = {
  runEscalationEngine() {
    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) return 0;

    let newEscalations = 0;
    const now = new Date();

    // ✅ OPTIMIZED: Pre-load and index open escalations into a Set for O(1) checking
    const openEscalations = new Set();
    for (const log of store.escalationLog) {
      if (log.status === 'open') {
        openEscalations.add(`${log.ruleId}:${log.affectedUserId}`);
      }
    }

    // ✅ OPTIMIZED: Index goal sheets by cycle and employee ID upfront to avoid O(N) searches inside employee loops
    const sheetsByEmployee = new Map();
    for (const sheet of store.goalSheets.values()) {
      if (sheet.cycleId === cycle.id) {
        sheetsByEmployee.set(sheet.employeeId, sheet);
      }
    }

    // ✅ OPTIMIZED: Build index of checked-in employees for the cycle to avoid O(N) scans inside loops
    const checkedInEmployeesByQuarter = new Map(); // quarter -> Set of employeeIds
    for (const ci of store.checkIns.values()) {
      if (ci.cycleId === cycle.id) {
        if (!checkedInEmployeesByQuarter.has(ci.quarter)) {
          checkedInEmployeesByQuarter.set(ci.quarter, new Set());
        }
        checkedInEmployeesByQuarter.get(ci.quarter).add(ci.employeeId);
      }
    }

    for (const rule of store.escalationRules.values()) {
      if (!rule.isActive) continue;

      if (rule.triggerType === 'submission-overdue' && cycle.activePhase === 'goal-setting') {
        const openDate = new Date(cycle.phases['goal-setting'].openDate);
        const daysSinceOpen = (now - openDate) / (1000 * 60 * 60 * 24);

        if (daysSinceOpen > rule.thresholdDays) {
          for (const sheet of store.goalSheets.values()) {
            if (sheet.cycleId !== cycle.id || sheet.status !== 'draft') continue;
            const user = store.users.get(sheet.employeeId);
            if (!user) continue;
            if (logEscalation(rule, user, `Goal sheet in draft for >${rule.thresholdDays} days.`, openEscalations)) {
              newEscalations++;
            }
          }
        }
      }

      if (rule.triggerType === 'approval-overdue') {
        for (const sheet of store.goalSheets.values()) {
          if (sheet.cycleId !== cycle.id || sheet.status !== 'submitted' || !sheet.submittedAt) continue;
          const daysSinceSubmit = (now - new Date(sheet.submittedAt)) / (1000 * 60 * 60 * 24);
          if (daysSinceSubmit <= rule.thresholdDays) continue;
          const user = store.users.get(sheet.employeeId);
          if (!user) continue;
          const manager = userRepository.findManagerOf(user.id);
          if (logEscalation(
            rule,
            user,
            `Submitted ${Math.floor(daysSinceSubmit)} days ago; pending approval from ${manager?.name || 'manager'}.`,
            openEscalations
          )) {
            newEscalations++;
          }
        }
      }

      if (rule.triggerType === 'checkin-overdue' && ['Q1', 'Q2', 'Q3', 'Q4'].includes(cycle.activePhase)) {
        const quarter = cycle.activePhase;
        const phase = cycle.phases[quarter];
        if (!phase || phase.status !== 'active') continue;

        const openDate = new Date(phase.openDate);
        const daysSinceOpen = (now - openDate) / (1000 * 60 * 60 * 24);
        if (daysSinceOpen <= rule.thresholdDays) continue;

        const employees = userRepository.findByRole('employee');
        const checkedInSet = checkedInEmployeesByQuarter.get(quarter) || new Set();

        for (const emp of employees) {
          const sheet = sheetsByEmployee.get(emp.id);
          if (!sheet || sheet.status !== 'approved') continue;

          // ✅ O(1) Set lookup replacing O(N) array scan
          const hasCheckIn = checkedInSet.has(emp.id);
          if (hasCheckIn) continue;

          if (logEscalation(rule, emp, `${quarter} check-in overdue by >${rule.thresholdDays} days.`, openEscalations)) {
            newEscalations++;
          }
        }
      }
    }

    return newEscalations;
  },

  getEscalationLogs() {
    return [...store.escalationLog].sort(
      (a, b) => new Date(b.escalatedAt).getTime() - new Date(a.escalatedAt).getTime()
    );
  },
};

export default escalationService;
