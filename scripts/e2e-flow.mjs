/**
 * E2E API flow: Employee submit -> Manager approve -> Check-in -> Admin report
 */
const BASE = 'http://localhost:4000/api/v1';

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Login failed (${email}): ${json?.error?.message || res.status}`);
  return json.data.token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, headers: res.headers };
}

async function main() {
  const steps = [];

  // 1. Raj - get goals
  const rajToken = await login('raj.patel@atomquest.com', 'Employee@123');
  let r = await api(rajToken, 'GET', '/goals/me');
  steps.push(['raj GET /goals/me', r.ok, r.json]);
  const sheetId = r.json?.data?.sheet?.id;
  const goals = r.json?.data?.goals || [];
  const weight = goals.reduce((s, g) => s + g.weightage, 0);
  console.log('Raj sheet:', r.json?.data?.sheet?.status, 'weight:', weight, 'goals:', goals.length);

  // 2. Raj - submit if draft
  if (r.json?.data?.sheet?.status === 'draft' || r.json?.data?.sheet?.status === 'returned') {
    r = await api(rajToken, 'POST', `/goals/sheet/${sheetId}/submit`);
    steps.push(['raj submit sheet', r.ok, r.json]);
    console.log('Submit:', r.ok, r.json?.data?.status || r.json?.error?.message);
  }

  // 3. John - pending approvals
  const johnToken = await login('john.dsouza@atomquest.com', 'Manager@123');
  r = await api(johnToken, 'GET', '/approval/pending');
  steps.push(['john GET /approval/pending', r.ok, r.json]);
  console.log('Pending approvals:', r.ok, Array.isArray(r.json?.data) ? r.json.data.length : r.json?.error?.message);

  const pending = r.json?.data || [];
  const rajSheet = pending.find((s) => s.employeeName?.includes('Raj')) || pending[0];

  if (rajSheet) {
    r = await api(johnToken, 'POST', `/approval/${rajSheet.id}/approve`);
    steps.push(['john approve', r.ok, r.json]);
    console.log('Approve:', r.ok, r.json?.data?.status || r.json?.error?.message);
  }

  // 4. Raj - check-in
  const rajToken2 = await login('raj.patel@atomquest.com', 'Employee@123');
  r = await api(rajToken2, 'GET', '/goals/me');
  const approvedGoals = r.json?.data?.goals || [];
  const entries = approvedGoals.map((g) => ({
    goalId: g.id,
    actualAchievement: g.uom === 'zero' ? 0 : Math.round(g.target * 0.8),
    status: 'on-track',
  }));

  r = await api(rajToken2, 'POST', '/checkins', {
    goalSheetId: sheetId,
    quarter: 'Q1',
    entries,
  });
  steps.push(['raj check-in', r.ok, r.json]);
  console.log('Check-in:', r.ok, r.json?.error?.message || 'ok');

  // 5. Admin - CSV report
  const adminToken = await login('maya.iyer@atomquest.com', 'Admin@123');
  const reportRes = await fetch(`${BASE}/admin/reports/download?quarter=Q1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const csv = await reportRes.text();
  steps.push(['admin CSV', reportRes.ok, { lines: csv.split('\n').length, preview: csv.slice(0, 200) }]);
  console.log('CSV report:', reportRes.ok, 'lines:', csv.split('\n').length);
  console.log(csv.split('\n').slice(0, 5).join('\n'));

  const failed = steps.filter((s) => !s[1]);
  if (failed.length) {
    console.error('\nFAILED STEPS:');
    failed.forEach(([name, , body]) => console.error(name, JSON.stringify(body, null, 2)));
    process.exit(1);
  }
  console.log('\nAll E2E steps passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
