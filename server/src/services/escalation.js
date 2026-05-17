/**
 * @module escalationService
 * @description Rule-based escalation engine (submission, approval, check-in overdue).
 */

import { v4 as uuidv4 } from 'uuid';
import store from '../store/inMemoryStore.js';
import cycleRepository from '../repository/cycleRepository.js';
import userRepository from '../repository/userRepository.js';

function logEscalation(rule, user, notes) {
  const alreadyEscalated = store.escalationLog.some(
    (log) => log.ruleId === rule.id && log.affectedUserId === user.id && log.status === 'open'
  );
  if (alreadyEscalated) return false;

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
  return true;
}

const escalationService = {
  runEscalationEngine() {
    const cycle = cycleRepository.findActiveCycle();
    if (!cycle) return 0;

    let newEscalations = 0;
    const now = new Date();

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
            if (logEscalation(rule, user, `Goal sheet in draft for >${rule.thresholdDays} days.`)) {
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
            `Submitted ${Math.floor(daysSinceSubmit)} days ago; pending approval from ${manager?.name || 'manager'}.`
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
        for (const emp of employees) {
          const sheet = Array.from(store.goalSheets.values()).find(
            (s) => s.employeeId === emp.id && s.cycleId === cycle.id && s.status === 'approved'
          );
          if (!sheet) continue;

          const hasCheckIn = Array.from(store.checkIns.values()).some(
            (ci) => ci.employeeId === emp.id && ci.cycleId === cycle.id && ci.quarter === quarter
          );
          if (hasCheckIn) continue;

          if (logEscalation(rule, emp, `${quarter} check-in overdue by >${rule.thresholdDays} days.`)) {
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
