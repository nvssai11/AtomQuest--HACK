import request from 'supertest';
import app from '../../src/app.js';
import store from '../../src/store/inMemoryStore.js';
import { seedStore, SEED_IDS } from '../../src/store/seed.js';
import authService from '../../src/services/authService.js';

describe('Shared goals (integration)', () => {
  let managerToken;
  let employeeToken;

  beforeEach(async () => {
    await seedStore();
    const managerLogin = await authService.login('john.dsouza@atomquest.com', 'Manager@123');
    const employeeLogin = await authService.login('aishwarya.ramesh@atomquest.com', 'Employee@123');
    managerToken = managerLogin.token;
    employeeToken = employeeLogin.token;

    store.goals.set(SEED_IDS.goals.aishwaryaTarget, {
      ...store.goals.get(SEED_IDS.goals.aishwaryaTarget),
      weightage: 40,
    });
  });

  it('lets a manager push a shared KPI and lets the recipient edit only weightage', async () => {
    const pushRes = await request(app)
      .post('/api/v1/goals/shared')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Shared pipeline hygiene KPI',
        description: 'Maintain CRM hygiene for all enterprise opportunities.',
        thrustArea: 'Department KPI',
        uom: 'numeric-min',
        target: 95,
        weightage: 10,
        recipientIds: [SEED_IDS.users.aishwarya],
      });

    expect(pushRes.status).toBe(201);
    expect(pushRes.body.data.links).toHaveLength(1);

    const recipientGoalId = pushRes.body.data.links[0].recipientGoalId;
    const recipientGoal = store.goals.get(recipientGoalId);
    expect(recipientGoal).toMatchObject({
      employeeId: SEED_IDS.users.aishwarya,
      isShared: true,
      title: 'Shared pipeline hygiene KPI',
      target: 95,
      weightage: 10,
    });

    const blockedTitleEdit = await request(app)
      .put(`/api/v1/goals/${recipientGoalId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Try to rename shared goal' });

    expect(blockedTitleEdit.status).toBe(403);

    const weightageEdit = await request(app)
      .put(`/api/v1/goals/${recipientGoalId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ weightage: 20 });

    expect(weightageEdit.status).toBe(200);
    expect(weightageEdit.body.data.weightage).toBe(20);
  });

  it('rejects shared KPI pushes that would exceed recipient total weightage', async () => {
    const pushRes = await request(app)
      .post('/api/v1/goals/shared')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Shared over capacity KPI',
        description: 'This KPI should not fit into the recipient sheet.',
        thrustArea: 'Department KPI',
        uom: 'numeric-min',
        target: 95,
        weightage: 30,
        recipientIds: [SEED_IDS.users.aishwarya],
      });

    expect(pushRes.status).toBe(422);
  });
});
