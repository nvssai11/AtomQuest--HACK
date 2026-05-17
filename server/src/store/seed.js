/**
 * @module seed
 * @description Seeds the in-memory store with realistic demo data.
 *
 * This module populates all collections with a coherent, cross-linked dataset
 * that demonstrates the full system: goals in various states, check-in history,
 * an audit trail, escalation entries, and org hierarchy.
 *
 * Seeding is deterministic — all IDs are hardcoded UUIDs so tests and the
 * demo can always reference known entity IDs. This follows the principle from
 * "The Pragmatic Programmer": reproducible environments prevent "works on my machine".
 *
 * Passwords are bcrypt-hashed. The plaintext credentials for the demo are:
 *   sarah.mehta@atomquest.com       / Employee@123
 *   raj.patel@atomquest.com         / Employee@123
 *   aishwarya.ramesh@atomquest.com  / Employee@123
 *   nikhil.singh@atomquest.com      / Employee@123
 *   john.dsouza@atomquest.com       / Manager@123
 *   maya.iyer@atomquest.com         / Admin@123
 */

import bcrypt from 'bcryptjs';
import store from './inMemoryStore.js';
import config from '../config.js';

// ─── Stable IDs (hardcoded so tests can reference them) ─────────────────────
export const SEED_IDS = {
  users: {
    sarah: 'usr-001-sarah-mehta',
    raj: 'usr-002-raj-patel',
    aishwarya: 'usr-005-aishwarya-ramesh',
    nikhil: 'usr-006-nikhil-singh',
    john: 'usr-003-john-dsouza',
    maya: 'usr-004-maya-iyer',
  },
  goalSheets: {
    sarah2025: 'gs-001-sarah-2025',
    raj2025: 'gs-002-raj-2025',
    aishwarya2025: 'gs-003-aishwarya-2025',
    nikhil2025: 'gs-004-nikhil-2025',
  },
  goals: {
    sarahSales: 'goal-001-sarah-sales',
    sarahNPS: 'goal-002-sarah-nps',
    sarahDraft: 'goal-003-sarah-draft',
    rajRevenue: 'goal-004-raj-revenue',
    rajDraft: 'goal-005-raj-draft',
    sharedDeptKPI: 'goal-006-shared-dept-kpi',
    aishwaryaTarget: 'goal-007-aishwarya-target',
    aishwaryaQuality: 'goal-008-aishwarya-quality',
    nikhilTarget: 'goal-009-nikhil-target',
    nikhilEfficiency: 'goal-010-nikhil-efficiency',
  },
  sharedLinks: {
    sarahKPI: 'sl-001-sarah-kpi',
    rajKPI: 'sl-002-raj-kpi',
  },
  checkIns: {
    sarahQ1: 'ci-001-sarah-q1',
  },
  cycles: {
    year2025: 'cycle-001-2025',
  },
  escalationRules: {
    submissionOverdue: 'er-001-submission',
    approvalOverdue: 'er-002-approval',
    checkinOverdue: 'er-003-checkin',
  },
};

/**
 * Seeds the store with demo data. Idempotent — safe to call multiple times
 *
 * @returns {Promise<void>}
 */
export async function seedStore() {
  // Clear all collections first
  store.users.clear();
  store.goals.clear();
  store.goalSheets.clear();
  store.sharedGoalLinks.clear();
  store.checkIns.clear();
  store.selfAssessments.clear();
  store.auditLog.length = 0;
  store.notifications.length = 0;
  store.escalationRules.clear();
  store.escalationLog.length = 0;
  store.cycles.clear();
  store.orgHierarchy.clear();

  const saltRounds = config.isTest ? 1 : config.auth.bcryptSaltRounds; // Fast hashing in tests
  const employeeHash = await bcrypt.hash('Employee@123', saltRounds);
  const managerHash = await bcrypt.hash('Manager@123', saltRounds);
  const adminHash = await bcrypt.hash('Admin@123', saltRounds);

  const now = new Date().toISOString();

  // ─── Users ──────────────────────────────────────────────────────────────
  store.users.set(SEED_IDS.users.sarah, {
    id: SEED_IDS.users.sarah,
    name: 'Sarah Mehta',
    email: 'sarah.mehta@atomquest.com',
    passwordHash: employeeHash,
    role: 'employee',
    managerId: SEED_IDS.users.john,
    department: 'Sales',
    designation: 'Senior Sales Executive',
    level: 'L1',
    avatarInitials: 'SM',
    createdAt: now,
  });

  store.users.set(SEED_IDS.users.raj, {
    id: SEED_IDS.users.raj,
    name: 'Raj Patel',
    email: 'raj.patel@atomquest.com',
    passwordHash: employeeHash,
    role: 'employee',
    managerId: SEED_IDS.users.john,
    department: 'Sales',
    designation: 'Sales Executive',
    level: 'L1',
    avatarInitials: 'RP',
    createdAt: now,
  });

  store.users.set(SEED_IDS.users.john, {
    id: SEED_IDS.users.john,
    name: "John D'Souza",
    email: 'john.dsouza@atomquest.com',
    passwordHash: managerHash,
    role: 'manager',
    managerId: SEED_IDS.users.maya,
    department: 'Sales',
    designation: 'Sales Manager',
    level: 'L2',
    avatarInitials: 'JD',
    createdAt: now,
  });

  store.users.set(SEED_IDS.users.aishwarya, {
    id: SEED_IDS.users.aishwarya,
    name: 'Aishwarya Ramesh',
    email: 'aishwarya.ramesh@atomquest.com',
    passwordHash: employeeHash,
    role: 'employee',
    managerId: SEED_IDS.users.john,
    department: 'Sales',
    designation: 'Account Executive',
    level: 'L1',
    avatarInitials: 'AR',
    createdAt: now,
  });

  store.users.set(SEED_IDS.users.nikhil, {
    id: SEED_IDS.users.nikhil,
    name: 'Nikhil Singh',
    email: 'nikhil.singh@atomquest.com',
    passwordHash: employeeHash,
    role: 'employee',
    managerId: SEED_IDS.users.john,
    department: 'Sales',
    designation: 'Sales Executive',
    level: 'L1',
    avatarInitials: 'NS',
    createdAt: now,
  });

  store.users.set(SEED_IDS.users.maya, {
    id: SEED_IDS.users.maya,
    name: 'Maya Iyer',
    email: 'maya.iyer@atomquest.com',
    passwordHash: adminHash,
    role: 'admin',
    managerId: null,
    department: 'HR',
    designation: 'HR Business Partner',
    level: 'HR',
    avatarInitials: 'MI',
    createdAt: now,
  });

  // Legacy orgHierarchy kept in sync for any direct store reads (prefer user.managerId)
  store.orgHierarchy.set(SEED_IDS.users.sarah, {
    userId: SEED_IDS.users.sarah,
    managerId: SEED_IDS.users.john,
    department: 'Sales',
    level: 'L1',
  });

  store.orgHierarchy.set(SEED_IDS.users.raj, {
    userId: SEED_IDS.users.raj,
    managerId: SEED_IDS.users.john,
    department: 'Sales',
    level: 'L1',
  });

  store.orgHierarchy.set(SEED_IDS.users.aishwarya, {
    userId: SEED_IDS.users.aishwarya,
    managerId: SEED_IDS.users.john,
    department: 'Sales',
    level: 'L1',
  });

  store.orgHierarchy.set(SEED_IDS.users.nikhil, {
    userId: SEED_IDS.users.nikhil,
    managerId: SEED_IDS.users.john,
    department: 'Sales',
    level: 'L1',
  });

  store.orgHierarchy.set(SEED_IDS.users.john, {
    userId: SEED_IDS.users.john,
    managerId: SEED_IDS.users.maya,
    department: 'Sales',
    level: 'L2',
  });

  // ─── Active Cycle ───────────────────────────────────────────────────────
  store.cycles.set(SEED_IDS.cycles.year2025, {
    id: SEED_IDS.cycles.year2025,
    year: 2025,
    activePhase: 'Q1', // Current phase drives check-in window
    phases: {
      'goal-setting': { openDate: '2025-05-01', closeDate: '2025-06-30', status: 'closed' },
      Q1: { openDate: '2025-07-01', closeDate: '2025-09-30', status: 'active' },
      Q2: { openDate: '2025-10-01', closeDate: '2025-12-31', status: 'upcoming' },
      Q3: { openDate: '2026-01-01', closeDate: '2026-03-31', status: 'upcoming' },
      Q4: { openDate: '2026-03-01', closeDate: '2026-04-30', status: 'upcoming' },
    },
    createdBy: SEED_IDS.users.maya,
    createdAt: now,
    updatedAt: now,
  });

  // ─── Goal Sheets ────────────────────────────────────────────────────────
  store.goalSheets.set(SEED_IDS.goalSheets.sarah2025, {
    id: SEED_IDS.goalSheets.sarah2025,
    employeeId: SEED_IDS.users.sarah,
    cycleId: SEED_IDS.cycles.year2025,
    year: 2025,
    status: 'approved', // approved | submitted | draft | returned
    submittedAt: '2025-05-20T10:00:00.000Z',
    approvedAt: '2025-05-22T14:30:00.000Z',
    approvedBy: SEED_IDS.users.john,
    returnComment: null,
    lockedAt: '2025-05-22T14:30:00.000Z',
    createdAt: '2025-05-10T09:00:00.000Z',
    updatedAt: '2025-05-22T14:30:00.000Z',
  });

  store.goalSheets.set(SEED_IDS.goalSheets.raj2025, {
    id: SEED_IDS.goalSheets.raj2025,
    employeeId: SEED_IDS.users.raj,
    cycleId: SEED_IDS.cycles.year2025,
    year: 2025,
    status: 'draft',
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    returnComment: null,
    lockedAt: null,
    createdAt: '2025-05-12T09:00:00.000Z',
    updatedAt: '2025-05-12T09:00:00.000Z',
  });

  store.goalSheets.set(SEED_IDS.goalSheets.aishwarya2025, {
    id: SEED_IDS.goalSheets.aishwarya2025,
    employeeId: SEED_IDS.users.aishwarya,
    cycleId: SEED_IDS.cycles.year2025,
    year: 2025,
    status: 'draft',
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    returnComment: null,
    lockedAt: null,
    createdAt: '2025-05-13T09:00:00.000Z',
    updatedAt: '2025-05-13T09:00:00.000Z',
  });

  store.goalSheets.set(SEED_IDS.goalSheets.nikhil2025, {
    id: SEED_IDS.goalSheets.nikhil2025,
    employeeId: SEED_IDS.users.nikhil,
    cycleId: SEED_IDS.cycles.year2025,
    year: 2025,
    status: 'draft',
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    returnComment: null,
    lockedAt: null,
    createdAt: '2025-05-13T09:15:00.000Z',
    updatedAt: '2025-05-13T09:15:00.000Z',
  });

  // ─── Goals ──────────────────────────────────────────────────────────────
  store.goals.set(SEED_IDS.goals.sarahSales, {
    id: SEED_IDS.goals.sarahSales,
    goalSheetId: SEED_IDS.goalSheets.sarah2025,
    employeeId: SEED_IDS.users.sarah,
    thrustArea: 'Sales Growth',
    title: 'Achieve Q2 South India Enterprise Revenue Target',
    description:
      'Drive enterprise sales in South India region to achieve ₹48L revenue in Q2 FY25, targeting 5 new enterprise accounts.',
    uom: 'numeric-min',
    target: 48,
    targetUnit: '₹ Lakhs',
    weightage: 40,
    isShared: false,
    sharedGoalLinkId: null,
    isLocked: true,
    unlockedAt: null,
    unlockedBy: null,
    unlockReason: null,
    createdAt: '2025-05-10T09:00:00.000Z',
    updatedAt: '2025-05-22T14:30:00.000Z',
  });

  store.goals.set(SEED_IDS.goals.sarahNPS, {
    id: SEED_IDS.goals.sarahNPS,
    goalSheetId: SEED_IDS.goalSheets.sarah2025,
    employeeId: SEED_IDS.users.sarah,
    thrustArea: 'Customer Success',
    title: 'Maintain Customer NPS Above 75',
    description:
      'Ensure post-sale customer satisfaction scores remain above 75 NPS through proactive account management and escalation resolution.',
    uom: 'numeric-min',
    target: 75,
    targetUnit: 'NPS Score',
    weightage: 30,
    isShared: false,
    sharedGoalLinkId: null,
    isLocked: true,
    unlockedAt: null,
    unlockedBy: null,
    unlockReason: null,
    createdAt: '2025-05-10T09:15:00.000Z',
    updatedAt: '2025-05-22T14:30:00.000Z',
  });

  // Shared departmental KPI (pushed by John to Sarah and Raj)
  store.goals.set(SEED_IDS.goals.sharedDeptKPI, {
    id: SEED_IDS.goals.sharedDeptKPI,
    goalSheetId: SEED_IDS.goalSheets.sarah2025,
    employeeId: SEED_IDS.users.sarah,
    thrustArea: 'Department KPI',
    title: 'Sales Department: Achieve ₹5Cr Q2 Revenue',
    description:
      'Collective department target — all Sales team members contribute to the ₹5Cr Q2 revenue goal.',
    uom: 'numeric-min',
    target: 500, // ₹ in Lakhs
    targetUnit: '₹ Lakhs',
    weightage: 30, // Sarah's weightage for this shared goal
    isShared: true,
    primaryOwnerId: SEED_IDS.users.john, // Manager pushed this
    sharedGoalLinkId: SEED_IDS.sharedLinks.sarahKPI,
    isLocked: true,
    unlockedAt: null,
    unlockedBy: null,
    unlockReason: null,
    createdAt: '2025-05-15T11:00:00.000Z',
    updatedAt: '2025-05-22T14:30:00.000Z',
  });

  store.goals.set(SEED_IDS.goals.rajRevenue, {
    id: SEED_IDS.goals.rajRevenue,
    goalSheetId: SEED_IDS.goalSheets.raj2025,
    employeeId: SEED_IDS.users.raj,
    thrustArea: 'Sales Growth',
    title: 'Achieve Q2 West India Sales Target',
    description:
      'Drive sales in West India territory to achieve ₹30L revenue in Q2 FY25.',
    uom: 'numeric-min',
    target: 30,
    targetUnit: '₹ Lakhs',
    weightage: 50,
    isShared: false,
    sharedGoalLinkId: null,
    isLocked: false,
    unlockedAt: null,
    unlockedBy: null,
    unlockReason: null,
    createdAt: '2025-05-12T09:30:00.000Z',
    updatedAt: '2025-05-12T09:30:00.000Z',
  });

  store.goals.set(SEED_IDS.goals.rajDraft, {
    id: SEED_IDS.goals.rajDraft,
    goalSheetId: SEED_IDS.goalSheets.raj2025,
    employeeId: SEED_IDS.users.raj,
    thrustArea: 'Customer Success',
    title: 'Zero Escalations from Key Accounts',
    description:
      'Maintain zero escalations from top-5 key accounts in West India by ensuring proactive engagement.',
    uom: 'zero',
    target: 0,
    targetUnit: 'Escalations',
    weightage: 50,
    isShared: false,
    sharedGoalLinkId: null,
    isLocked: false,
    unlockedAt: null,
    unlockedBy: null,
    unlockReason: null,
    createdAt: '2025-05-12T09:45:00.000Z',
    updatedAt: '2025-05-12T09:45:00.000Z',
  });

  // ─── Aishwarya's Goals (Draft, Unlocked) ────────────────────────────────
  store.goals.set(SEED_IDS.goals.aishwaryaTarget, {
    id: SEED_IDS.goals.aishwaryaTarget,
    goalSheetId: SEED_IDS.goalSheets.aishwarya2025,
    employeeId: SEED_IDS.users.aishwarya,
    thrustArea: 'Sales Growth',
    title: 'Achieve Q2 Account Executive Territory Target',
    description:
      'Drive new account acquisitions in assigned territory to achieve ₹25L revenue in Q2 FY25.',
    uom: 'numeric-min',
    target: 25,
    targetUnit: '₹ Lakhs',
    weightage: 60,
    isShared: false,
    sharedGoalLinkId: null,
    isLocked: false,
    unlockedAt: null,
    unlockedBy: null,
    unlockReason: null,
    createdAt: '2025-05-13T09:00:00.000Z',
    updatedAt: '2025-05-13T09:00:00.000Z',
  });

  store.goals.set(SEED_IDS.goals.aishwaryaQuality, {
    id: SEED_IDS.goals.aishwaryaQuality,
    goalSheetId: SEED_IDS.goalSheets.aishwarya2025,
    employeeId: SEED_IDS.users.aishwarya,
    thrustArea: 'Customer Success',
    title: 'Maintain Customer Satisfaction > 80%',
    description:
      'Ensure customer satisfaction scores remain above 80% through consistent follow-up and issue resolution.',
    uom: 'percent-min',
    target: 80,
    targetUnit: '%',
    weightage: 40,
    isShared: false,
    sharedGoalLinkId: null,
    isLocked: false,
    unlockedAt: null,
    unlockedBy: null,
    unlockReason: null,
    createdAt: '2025-05-13T09:15:00.000Z',
    updatedAt: '2025-05-13T09:15:00.000Z',
  });

  // ─── Nikhil's Goals (Draft, Unlocked) ────────────────────────────────────
  store.goals.set(SEED_IDS.goals.nikhilTarget, {
    id: SEED_IDS.goals.nikhilTarget,
    goalSheetId: SEED_IDS.goalSheets.nikhil2025,
    employeeId: SEED_IDS.users.nikhil,
    thrustArea: 'Sales Growth',
    title: 'Achieve North India Sales Target',
    description:
      'Drive sales in North India territory to achieve ₹35L revenue in Q2 FY25.',
    uom: 'numeric-min',
    target: 35,
    targetUnit: '₹ Lakhs',
    weightage: 55,
    isShared: false,
    sharedGoalLinkId: null,
    isLocked: false,
    unlockedAt: null,
    unlockedBy: null,
    unlockReason: null,
    createdAt: '2025-05-13T09:20:00.000Z',
    updatedAt: '2025-05-13T09:20:00.000Z',
  });

  store.goals.set(SEED_IDS.goals.nikhilEfficiency, {
    id: SEED_IDS.goals.nikhilEfficiency,
    goalSheetId: SEED_IDS.goalSheets.nikhil2025,
    employeeId: SEED_IDS.users.nikhil,
    thrustArea: 'Delivery',
    title: 'Complete Deal Cycle in 45 Days',
    description:
      'Reduce sales cycle duration from end of prospecting to contract signature to 45 days or less.',
    uom: 'numeric-max',
    target: 45,
    targetUnit: 'Days',
    weightage: 45,
    isShared: false,
    sharedGoalLinkId: null,
    isLocked: false,
    unlockedAt: null,
    unlockedBy: null,
    unlockReason: null,
    createdAt: '2025-05-13T09:35:00.000Z',
    updatedAt: '2025-05-13T09:35:00.000Z',
  });

  // ─── Shared Goal Links ───────────────────────────────────────────────────
  store.sharedGoalLinks.set(SEED_IDS.sharedLinks.sarahKPI, {
    id: SEED_IDS.sharedLinks.sarahKPI,
    masterGoalId: SEED_IDS.goals.sharedDeptKPI,
    recipientId: SEED_IDS.users.sarah,
    recipientGoalId: SEED_IDS.goals.sharedDeptKPI,
    weightage: 30,
    pushedBy: SEED_IDS.users.john,
    pushedAt: '2025-05-15T11:00:00.000Z',
  });

  // ─── Check-ins ───────────────────────────────────────────────────────────
  store.checkIns.set(SEED_IDS.checkIns.sarahQ1, {
    id: SEED_IDS.checkIns.sarahQ1,
    employeeId: SEED_IDS.users.sarah,
    goalSheetId: SEED_IDS.goalSheets.sarah2025,
    quarter: 'Q1',
    cycleId: SEED_IDS.cycles.year2025,
    submittedAt: '2025-07-15T10:00:00.000Z',
    managerComment: null,
    managerCommentAt: null,
    commentBy: null,
    entries: [
      {
        goalId: SEED_IDS.goals.sarahSales,
        actualAchievement: 38,
        status: 'on-track',
        computedScore: null, // Calculated on read via scoring service
      },
      {
        goalId: SEED_IDS.goals.sarahNPS,
        actualAchievement: 78,
        status: 'completed',
        computedScore: null,
      },
      {
        goalId: SEED_IDS.goals.sharedDeptKPI,
        actualAchievement: 190,
        status: 'on-track',
        computedScore: null,
      },
    ],
    createdAt: '2025-07-15T10:00:00.000Z',
    updatedAt: '2025-07-15T10:00:00.000Z',
  });

  // ─── Audit Log ───────────────────────────────────────────────────────────
  store.auditLog.push({
    id: 'audit-001',
    entityType: 'goal',
    entityId: SEED_IDS.goals.sarahSales,
    action: 'FIELD_UPDATED',
    field: 'target',
    oldValue: '45',
    newValue: '48',
    performedBy: SEED_IDS.users.maya,
    performedByName: 'Maya Iyer',
    reason: 'Revised based on Q4 FY24 actuals and updated territory potential',
    timestamp: '2025-06-01T11:00:00.000Z',
  });

  store.auditLog.push({
    id: 'audit-002',
    entityType: 'goal',
    entityId: SEED_IDS.goals.sarahSales,
    action: 'GOAL_UNLOCKED',
    field: 'isLocked',
    oldValue: 'true',
    newValue: 'false',
    performedBy: SEED_IDS.users.maya,
    performedByName: 'Maya Iyer',
    reason: 'Target revision approved by BU Head — updated from ₹45L to ₹48L',
    timestamp: '2025-06-01T10:55:00.000Z',
  });

  // ─── Escalation Rules ────────────────────────────────────────────────────
  store.escalationRules.set(SEED_IDS.escalationRules.submissionOverdue, {
    id: SEED_IDS.escalationRules.submissionOverdue,
    triggerType: 'submission-overdue',
    thresholdDays: 7,
    isActive: true,
    createdBy: SEED_IDS.users.maya,
    createdAt: now,
  });

  store.escalationRules.set(SEED_IDS.escalationRules.approvalOverdue, {
    id: SEED_IDS.escalationRules.approvalOverdue,
    triggerType: 'approval-overdue',
    thresholdDays: 5,
    isActive: true,
    createdBy: SEED_IDS.users.maya,
    createdAt: now,
  });

  store.escalationRules.set(SEED_IDS.escalationRules.checkinOverdue, {
    id: SEED_IDS.escalationRules.checkinOverdue,
    triggerType: 'checkin-overdue',
    thresholdDays: 10,
    isActive: true,
    createdBy: SEED_IDS.users.maya,
    createdAt: now,
  });

  // Seeded escalation: Raj has not submitted goals (draft state for 15 days)
  store.escalationLog.push({
    id: 'esc-001',
    ruleId: SEED_IDS.escalationRules.submissionOverdue,
    triggerType: 'submission-overdue',
    affectedUserId: SEED_IDS.users.raj,
    affectedUserName: 'Raj Patel',
    managerId: SEED_IDS.users.john,
    status: 'open',
    escalatedAt: '2025-05-27T09:00:00.000Z',
    resolvedAt: null,
    notes: 'Goal sheet in draft for 15 days. Auto-escalated to manager John D\'Souza.',
  });

  // ─── Notifications ───────────────────────────────────────────────────────
  store.notifications.push({
    id: 'notif-001',
    type: 'goal-submitted',
    channel: 'email',
    recipient: 'john.dsouza@atomquest.com',
    subject: 'Goal Sheet Submitted for Review — Sarah Mehta',
    body: 'Sarah Mehta has submitted her goal sheet for your review. Please log in to the portal to approve or return for rework.',
    deepLink: '/approval/gs-001-sarah-2025',
    sentAt: '2025-05-20T10:01:00.000Z',
    status: 'delivered',
  });

  store.notifications.push({
    id: 'notif-002',
    type: 'goal-approved',
    channel: 'email',
    recipient: 'sarah.mehta@atomquest.com',
    subject: 'Your Goals Have Been Approved — FY2025',
    body: "Your goal sheet for FY2025 has been approved by John D'Souza. Your goals are now locked. Good luck!",
    deepLink: '/goals',
    sentAt: '2025-05-22T14:31:00.000Z',
    status: 'delivered',
  });

  store.notifications.push({
    id: 'notif-003',
    type: 'escalation',
    channel: 'teams',
    recipient: 'john.dsouza@atomquest.com',
    subject: '⚠️ Escalation: Raj Patel — Goals Not Submitted',
    body: "Raj Patel has not submitted his goal sheet 15 days after the cycle opened. Action required.",
    deepLink: '/approval',
    sentAt: '2025-05-27T09:00:00.000Z',
    status: 'delivered',
  });
}
