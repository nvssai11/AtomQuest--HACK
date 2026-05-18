/**
 * Integration test: approval pending list uses repository, not broken store access.
 * Uses real in-memory store (no mocks) — reset via seed pattern in test.
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import store from '../../src/store/inMemoryStore.js';
import { seedStore, SEED_IDS } from '../../src/store/seed.js';
import authService from '../../src/services/authService.js';

describe('Approval flow (integration)', () => {
  let managerToken;
  let employeeToken;

  beforeAll(async () => {
    await seedStore();
    
    // Set the cycle phase to 'approval' so approvals are valid during integration tests
    const activeCycle = store.cycles.get(SEED_IDS.cycles.year2025);
    if (activeCycle) {
      activeCycle.activePhase = 'approval';
      if (activeCycle.phases['approval']) {
        activeCycle.phases['approval'].status = 'active';
      }
      if (activeCycle.phases['Q1']) {
        activeCycle.phases['Q1'].status = 'upcoming';
      }
      store.cycles.set(activeCycle.id, activeCycle);
    }

    const managerLogin = await authService.login('john.dsouza@atomquest.com', 'Manager@123');
    const employeeLogin = await authService.login('raj.patel@atomquest.com', 'Employee@123');
    managerToken = managerLogin.token;
    employeeToken = employeeLogin.token;
  });

  it('lists Raj in pending after submit and approves successfully', async () => {
    const sheetId = SEED_IDS.goalSheets.raj2025;

    const submitRes = await request(app)
      .post(`/api/v1/goals/sheet/${sheetId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('submitted');

    const rajGoalsBeforeApproval = Array.from(store.goals.values()).filter(
      (goal) => goal.goalSheetId === sheetId
    );
    expect(rajGoalsBeforeApproval.length).toBeGreaterThan(0);

    const employeeEditRes = await request(app)
      .put(`/api/v1/goals/${rajGoalsBeforeApproval[0].id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ weightage: 50 });

    expect(employeeEditRes.status).toBe(403);

    const employeeDeleteRes = await request(app)
      .delete(`/api/v1/goals/${rajGoalsBeforeApproval[0].id}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(employeeDeleteRes.status).toBe(403);

    const pendingRes = await request(app)
      .get('/api/v1/approval/pending')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.success).toBe(true);
    const rajPending = pendingRes.body.data.find((s) => s.id === sheetId);
    expect(rajPending).toBeDefined();
    expect(rajPending.employeeName).toBe('Raj Patel');

    const detailRes = await request(app)
      .get(`/api/v1/approval/${sheetId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.goals.length).toBeGreaterThan(0);

    const approveRes = await request(app)
      .post(`/api/v1/approval/${sheetId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');

    const sheet = store.goalSheets.get(sheetId);
    expect(sheet.status).toBe('approved');
    const rajGoalsAfterApproval = Array.from(store.goals.values()).filter(
      (goal) => goal.goalSheetId === sheetId
    );
    expect(rajGoalsAfterApproval.every((goal) => goal.isLocked)).toBe(true);
  });
});
