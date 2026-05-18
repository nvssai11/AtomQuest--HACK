import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext.jsx';
import { Button, Card, Badge, Input, LoadingSpinner, EmptyState } from '../components/primitives';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'on-track', label: 'On Track' },
  { value: 'completed', label: 'Completed' },
];

const CheckIn = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [cycleInfo, setCycleInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actuals, setActuals] = useState({});
  const { notify } = useNotification();
  const [statuses, setStatuses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const activeQuarter = cycleInfo?.activeQuarter || 'Q1';

  const fetchData = async () => {
    try {
      const [goalsRes, cycleRes] = await Promise.all([
        api.get('/goals/me'),
        api.get('/cycle/current'),
      ]);
      setData(goalsRes);
      setCycleInfo(cycleRes);

      const activeQ = cycleRes?.activeQuarter || 'Q1';
      let existingCheckIn = null;
      try {
        const checkinRes = await api.get(`/checkins/me?quarter=${activeQ}`);
        existingCheckIn = checkinRes;
      } catch (err) {
        console.error('Failed to load existing check-in', err);
      }

      const hasSubmitted = Boolean(existingCheckIn && existingCheckIn.submittedAt);
      setSubmitted(hasSubmitted);

      const initialActuals = {};
      const initialStatuses = {};

      if (existingCheckIn) {
        goalsRes.goals.forEach((goal) => {
          const entry = existingCheckIn.entries?.find((e) => e.goalId === goal.id);
          initialActuals[goal.id] = entry ? String(entry.actualAchievement) : '';
          initialStatuses[goal.id] = entry ? entry.status : 'on-track';
        });
      } else {
        goalsRes.goals.forEach((goal) => {
          initialActuals[goal.id] = '';
          initialStatuses[goal.id] = 'on-track';
        });
      }

      setActuals(initialActuals);
      setStatuses(initialStatuses);
    } catch (err) {
      setError(err.message);
      notify.error(err.message || 'Failed to load check-in data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitClick = (e) => {
    e.preventDefault();
    setConfirmSubmitOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmSubmitOpen(false);
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
      notify.success(`${activeQuarter} check-in submitted successfully.`);
    } catch (err) {
      notify.error(err.message || 'Failed to submit check-in.');
    }
  };

  if (loading) return <Layout><div className="flex justify-center p-8"><LoadingSpinner size="lg" /></div></Layout>;
  if (error) return <Layout><EmptyState icon="❌" title="Error loading data" description={error} /></Layout>;

  const { sheet, goals } = data;
  const windowOpen = Boolean(cycleInfo?.activeQuarter);

  if (sheet.status !== 'approved') {
    return (
      <Layout>
        <Card className="text-center py-12">
          <EmptyState 
            icon="🔒" 
            title="Check-in Unavailable" 
            description="Your goal sheet must be approved by your manager before you can submit check-ins." 
            className="min-h-[200px]"
          />
        </Card>
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
        <Card className="mb-6 border-success bg-success-bg p-4">
          <p className="text-success font-medium">{activeQuarter} check-in submitted successfully.</p>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmitClick}>
          {goals.length === 0 ? (
            <EmptyState icon="📝" title="No goals found" description="You have no goals to check in on." />
          ) : (
            <div className="space-y-6 mb-8">
              {goals.map((goal, index) => {
                const isRecipientSharedGoal = goal.isShared && goal.primaryOwnerId !== user?.id;
                return (
                  <div key={goal.id} className="p-5 border border-border-color rounded-xl bg-bg-secondary">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-text-primary text-lg mb-1">Goal {index + 1}: {goal.title}</h3>
                        {goal.isShared && <Badge variant="warning">Shared KPI</Badge>}
                      </div>
                      <Badge variant="brand">{goal.weightage}% weight</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-bg-primary p-5 rounded-lg border border-border-color items-end">
                      <div>
                        <p className="text-sm text-text-secondary mb-1">Target</p>
                        <p className="text-xl font-bold text-brand-600">{goal.target} <span className="text-sm text-text-secondary font-normal">({goal.targetUnit || goal.uom})</span></p>
                      </div>
                      <div>
                        <Input
                          label="Actual Achievement"
                          type={goal.uom === 'timeline' ? 'date' : 'number'}
                          required
                          disabled={!windowOpen || submitted || isRecipientSharedGoal}
                          value={actuals[goal.id] || ''}
                          onChange={(e) => setActuals({ ...actuals, [goal.id]: e.target.value })}
                          className="mb-0"
                        />
                      </div>
                      <div>
                        <Input
                          as="select"
                          label="Status"
                          disabled={!windowOpen || submitted || isRecipientSharedGoal}
                          value={statuses[goal.id] || 'on-track'}
                          onChange={(e) => setStatuses({ ...statuses, [goal.id]: e.target.value })}
                          className="mb-0"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </Input>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-border-color pt-6 flex justify-end">
            <Button variant="primary" type="submit" disabled={!windowOpen || goals.length === 0 || submitted}>
              Submit {activeQuarter} Check-In
            </Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={confirmSubmitOpen}
        title={`Submit ${activeQuarter} check-in`}
        message={`Are you sure you want to submit your ${activeQuarter} check-in data? Once submitted, your manager will review your progress.`}
        confirmText="Submit"
        cancelText="Cancel"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setConfirmSubmitOpen(false)}
      />
    </Layout>
  );
};

export default CheckIn;
