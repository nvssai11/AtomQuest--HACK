import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Badge } from '../components/UI';
import { api } from '../api';

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'on-track', label: 'On Track' },
  { value: 'completed', label: 'Completed' },
];

const CheckIn = () => {
  const [data, setData] = useState(null);
  const [cycleInfo, setCycleInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actuals, setActuals] = useState({});
  const [statuses, setStatuses] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const activeQuarter = cycleInfo?.activeQuarter || 'Q1';

  const fetchData = async () => {
    try {
      const [goalsRes, cycleRes] = await Promise.all([
        api.get('/goals/me'),
        api.get('/cycle/current'),
      ]);
      setData(goalsRes);
      setCycleInfo(cycleRes);

      const initialActuals = {};
      const initialStatuses = {};
      goalsRes.goals.forEach((goal) => {
        initialActuals[goal.id] = '';
        initialStatuses[goal.id] = 'on-track';
      });
      setActuals(initialActuals);
      setStatuses(initialStatuses);
      setSubmitted(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Submit ${activeQuarter} check-in?`)) return;

    const entries = goals.map((goal) => ({
      goalId: goal.id,
      actualAchievement: goal.uom === 'timeline' ? actuals[goal.id] : Number(actuals[goal.id]),
      status: statuses[goal.id] || 'on-track',
    }));

    try {
      await api.post('/checkins', {
        quarter: activeQuarter,
        entries,
      });
      setSubmitted(true);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>;
  if (error) return <Layout><div className="p-8 text-danger">{error}</div></Layout>;

  const { sheet, goals } = data;
  const windowOpen = Boolean(cycleInfo?.activeQuarter);

  if (sheet.status !== 'approved') {
    return (
      <Layout>
        <div className="card text-center py-12">
          <span className="text-4xl mb-4 block">🔒</span>
          <h2 className="text-xl font-bold mb-2">Check-in Unavailable</h2>
          <p className="text-text-secondary">Your goal sheet must be approved by your manager before you can submit check-ins.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Quarterly Check-In</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={windowOpen ? 'success' : 'warning'}>{activeQuarter} {cycleInfo?.cycle?.year || 2025}</Badge>
          <span className="text-sm text-text-secondary">
            {windowOpen
              ? `Active phase: ${cycleInfo.activePhase} — check-in window is open`
              : 'Check-in window is currently closed for this phase'}
          </span>
        </div>
      </div>

      {submitted && (
        <div className="card mb-6 border border-success/30 bg-success-bg">
          <p className="text-success font-medium">{activeQuarter} check-in submitted successfully.</p>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 mb-8">
            {goals.map((goal, index) => (
              <div key={goal.id} className="p-4 border border-border-color rounded-lg bg-bg-secondary">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-text-primary">Goal {index + 1}: {goal.title}</h3>
                    {goal.isShared && <Badge variant="warning">Shared KPI</Badge>}
                  </div>
                  <Badge variant="brand">{goal.weightage}%</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-bg-primary p-4 rounded border border-border-color">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Target</p>
                    <p className="font-bold">{goal.target} {goal.targetUnit}</p>
                  </div>
                  <div className="input-group mb-0">
                    <label className="input-label">Actual Achievement</label>
                    {goal.uom === 'timeline' ? (
                      <input
                        type="date"
                        className="input-field"
                        required
                        disabled={!windowOpen}
                        value={actuals[goal.id] || ''}
                        onChange={(e) => setActuals({ ...actuals, [goal.id]: e.target.value })}
                      />
                    ) : (
                      <input
                        type="number"
                        className="input-field"
                        required
                        disabled={!windowOpen}
                        value={actuals[goal.id] || ''}
                        onChange={(e) => setActuals({ ...actuals, [goal.id]: e.target.value })}
                      />
                    )}
                  </div>
                  <div className="input-group mb-0">
                    <label className="input-label">Status</label>
                    <select
                      className="input-field"
                      disabled={!windowOpen}
                      value={statuses[goal.id] || 'on-track'}
                      onChange={(e) => setStatuses({ ...statuses, [goal.id]: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border-color pt-6 flex justify-end">
            <button type="submit" className="btn btn-primary px-8" disabled={!windowOpen}>
              Submit {activeQuarter} Check-In
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CheckIn;
