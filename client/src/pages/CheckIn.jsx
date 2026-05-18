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

// Port of pure scoring service logic for real-time interactive previews
const calculateEstimatedScore = (uom, achievement, target) => {
  if (achievement === null || achievement === undefined || achievement === '') return 0;

  switch (uom) {
    case 'numeric-min':
    case 'percent-min': {
      const ach = Number(achievement);
      const tgt = Number(target);
      if (tgt === 0) return 0;
      return Math.round((ach / tgt) * 100);
    }
    case 'numeric-max':
    case 'percent-max': {
      const ach = Number(achievement);
      const tgt = Number(target);
      if (ach === 0) return 200;
      return Math.round((tgt / ach) * 100);
    }
    case 'timeline': {
      const achDate = new Date(achievement).getTime();
      const tgtDate = new Date(target).getTime();
      if (Number.isNaN(achDate) || Number.isNaN(tgtDate)) return 0;
      return achDate <= tgtDate ? 100 : 0;
    }
    case 'zero': {
      return Number(achievement) === 0 ? 100 : 0;
    }
    default:
      return 0;
  }
};

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
  const [checkInDetails, setCheckInDetails] = useState(null);
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
      setCheckInDetails(existingCheckIn);

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

      // ✅ Invalidate affected caches
      api.invalidateCache(`/checkins/me?quart er=${activeQuarter}`);
      api.invalidateCache('/checkins/team');
      api.invalidateCache('/analytics/manager-effectiveness');

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

  // Calculate live statistics for Check-In Summary Banner
  let totalWeightageFilled = 0;
  let averageScoreSum = 0;
  let itemsEvaluatedCount = 0;

  goals.forEach((goal) => {
    const act = actuals[goal.id];
    if (act !== undefined && act !== '') {
      const score = calculateEstimatedScore(goal.uom, act, goal.target);
      // Weighted score contribution
      averageScoreSum += (score * (goal.weightage / 100));
      itemsEvaluatedCount += 1;
    }
    totalWeightageFilled += goal.weightage;
  });

  const estimatedTotalScore = Math.round(averageScoreSum);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Quarterly Check-In</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={windowOpen ? 'success' : 'warning'}>{activeQuarter} {cycleInfo?.cycle?.year || 2025}</Badge>
          <span className="text-sm text-text-secondary font-medium">
            {windowOpen
              ? `Active phase: ${cycleInfo.activePhase} — quarterly check-in window is open`
              : 'Check-in window is currently closed for this phase'}
          </span>
        </div>
      </div>

      {submitted && (
        <div className="space-y-4 mb-6">
          <Card className="border-success bg-success-bg p-4 shadow-sm" style={{ borderLeft: '4px solid var(--success)' }}>
            <p className="text-success font-bold m-0 flex items-center gap-2">
              <span>✓</span> {activeQuarter} check-in submitted successfully and locked for manager evaluation.
            </p>
          </Card>
          {checkInDetails?.managerComment && (
            <Card className="border-brand-500 bg-brand-50 p-4 shadow-sm" style={{ borderLeft: '4px solid var(--brand-500)' }}>
              <p className="text-brand-600 font-bold m-0 mb-2">Manager Feedback:</p>
              <p className="text-text-primary text-sm m-0">{checkInDetails.managerComment}</p>
            </Card>
          )}
        </div>
      )}

      {/* Real-time Dynamic Score Summary Card */}
      {!submitted && goals.length > 0 && (
        <div 
          className="premium-greeting-card mb-8 animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
            padding: '1.5rem 2rem !important'
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="greeting-time-chip" style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                Live Achievement Tracker
              </div>
              <h2 className="text-xl font-bold mt-2 m-0 text-white">Estimated Check-In Score: {estimatedTotalScore}%</h2>
              <p className="text-xs text-white/90 mt-1 m-0">
                Calculated on-the-fly based on entered goal achievements and weightages. Perfect alignment ensures optimal cycle scores!
              </p>
            </div>
            <div className="flex gap-6 text-white text-right">
              <div>
                <p className="text-xs opacity-80 m-0 font-medium">Goals Evaluated</p>
                <p className="text-xl font-extrabold m-0">{itemsEvaluatedCount} / {goals.length}</p>
              </div>
              <div>
                <p className="text-xs opacity-80 m-0 font-medium">Weighted Target</p>
                <p className="text-xl font-extrabold m-0">{totalWeightageFilled}%</p>
              </div>
            </div>
          </div>
        </div>
      )}



      <Card>
        <form onSubmit={handleSubmitClick}>
          {goals.length === 0 ? (
            <EmptyState icon="📝" title="No goals found" description="You have no goals to check in on." />
          ) : (
            <div className="space-y-6 mb-8">
              {goals.map((goal, index) => {
                const isRecipientSharedGoal = goal.isShared && goal.primaryOwnerId !== user?.id;
                const currentActual = actuals[goal.id];
                const estGoalScore = calculateEstimatedScore(goal.uom, currentActual, goal.target);
                
                return (
                  <div 
                    key={goal.id} 
                    className="p-5 border border-border-color rounded-xl bg-bg-secondary transition-all hover:shadow-sm"
                    style={{
                      borderLeft: isRecipientSharedGoal ? '4px solid var(--warning)' : '4px solid var(--brand-500)'
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-text-primary text-base mb-1">
                          Goal {index + 1}: {goal.title}
                        </h3>
                        <p className="text-xs text-text-secondary leading-normal max-w-2xl">{goal.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="brand">{goal.thrustArea}</Badge>
                          {goal.isShared && (
                            <Badge variant="warning">Shared KPI • Managed by {isRecipientSharedGoal ? 'Manager' : 'You'}</Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="brand" className="font-bold">{goal.weightage}% weight</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-bg-primary p-5 rounded-lg border border-border-color items-end">
                      <div>
                        <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1">Cycle Target</p>
                        <p className="text-lg font-bold text-brand-600 m-0">
                          {goal.target} <span className="text-xs text-text-secondary font-semibold">({goal.targetUnit || goal.uom})</span>
                        </p>
                      </div>
                      <div>
                        <Input
                          label="Actual Achievement"
                          type={goal.uom === 'timeline' ? 'date' : 'number'}
                          required
                          disabled={!windowOpen || submitted}
                          value={currentActual || ''}
                          onChange={(e) => setActuals({ ...actuals, [goal.id]: e.target.value })}
                          className="mb-0"
                          placeholder="Enter achievement value"
                        />
                      </div>
                      <div>
                        <Input
                          as="select"
                          label="Status"
                          disabled={!windowOpen || submitted}
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

                    {/* Interactive Real-Time Estimated Score Chip */}
                    {currentActual !== undefined && currentActual !== '' && (
                      <div className="mt-4 pt-3 border-t border-border-color flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text-secondary">Estimated Goal Score Contribution:</span>
                          <Badge variant={estGoalScore >= 100 ? 'success' : estGoalScore >= 75 ? 'brand' : 'warning'}>
                            {estGoalScore}%
                          </Badge>
                        </div>
                        <span className="text-text-secondary font-medium">
                          {estGoalScore >= 100 ? '🎉 Exceeding Target!' : estGoalScore >= 75 ? '👍 On Track' : '⚠️ Below Target'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-border-color pt-6 flex justify-end">
            <Button variant="primary" type="submit" disabled={!windowOpen || goals.length === 0 || submitted}>
              Submit {activeQuarter} Check-In Data
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
