import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext.jsx';
import { Button, Card, Badge, Input, LoadingSpinner, EmptyState } from '../components/primitives';

const STATUS_LABELS = {
  'not-started': 'Not Started',
  'on-track': 'On Track',
  completed: 'Completed',
};

const TeamCheckIn = () => {
  const [quarter, setQuarter] = useState('Q1');
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const { notify } = useNotification();

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/checkins/team?quarter=${quarter}`);
      setTeam(data || []);
    } catch (err) {
      notify.error(err.message || 'Unable to load team check-ins.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [quarter]);

  const handleComment = async (checkinId) => {
    const comment = comments[checkinId];
    if (!comment?.trim() || comment.trim().length < 10) {
      notify.error('Comment must be at least 10 characters.');
      return;
    }
    try {
      await api.post(`/checkins/${checkinId}/comment`, { comment });
      notify.success('Check-in comment saved.');
      fetchTeam();
    } catch (err) {
      notify.error(err.message || 'Unable to save comment.');
    }
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Team Check-Ins</h1>
          <p className="text-text-secondary">Review planned vs. actual and document quarterly discussions.</p>
        </div>
        <Input 
          as="select" 
          value={quarter} 
          onChange={(e) => setQuarter(e.target.value)}
          className="w-auto mb-0"
        >
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </Input>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : team.length === 0 ? (
        <Card className="text-center py-12">
          <EmptyState icon="👥" title="No direct reports" description="You have no team members assigned to you." />
        </Card>
      ) : (
        <div className="space-y-6">
          {team.map(({ employee, sheet, goals, checkIn }) => (
            <Card key={employee.id} className="border-l-4 border-l-brand-500">
              <div className="flex justify-between items-start mb-6 border-b border-border-color pb-4">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{employee.name}</h2>
                  <p className="text-sm text-text-secondary mt-1">{employee.department} • Sheet: <span className="font-medium text-text-primary">{sheet?.status || 'n/a'}</span></p>
                </div>
                <Badge variant={checkIn ? 'success' : 'warning'}>
                  {checkIn ? `${quarter} Submitted` : 'Pending'}
                </Badge>
              </div>

              {!checkIn ? (
                <EmptyState icon="⏳" title="Pending Submission" description={`No check-in submitted for ${quarter} yet.`} className="min-h-[150px]" />
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {goals.map((goal) => {
                      const entry = checkIn.entries?.find((e) => e.goalId === goal.id);
                      return (
                        <div key={goal.id} className="p-4 bg-bg-secondary rounded-xl border border-border-color text-sm">
                          <p className="font-bold text-text-primary text-base mb-3">{goal.title}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-bg-primary p-3 rounded-lg border border-border-color">
                            <div>
                              <p className="text-xs text-text-secondary mb-1">Target</p>
                              <p className="font-semibold">{goal.target} {goal.targetUnit}</p>
                            </div>
                            <div>
                              <p className="text-xs text-text-secondary mb-1">Actual</p>
                              <p className="font-semibold">{entry?.actualAchievement ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-text-secondary mb-1">Score</p>
                              <p className="font-semibold text-brand-600">{entry?.computedScore ?? '—'}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-text-secondary mb-1">Status</p>
                              <Badge variant={entry?.status === 'completed' ? 'success' : entry?.status === 'not-started' ? 'danger' : 'brand'}>
                                {STATUS_LABELS[entry?.status] || entry?.status || '—'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {checkIn.managerComment ? (
                    <div className="bg-brand-50 border border-brand-100 p-4 rounded-xl text-sm">
                      <p className="font-bold text-brand-600 mb-2">Manager Feedback:</p>
                      <p className="text-text-primary">{checkIn.managerComment}</p>
                    </div>
                  ) : (
                    <div className="border-t border-border-color pt-6">
                      <Input
                        as="textarea"
                        label="Check-in Comment"
                        rows="3"
                        className="resize-none"
                        placeholder="Document the quarterly discussion (min 10 chars)..."
                        value={comments[checkIn.id] || ''}
                        onChange={(e) => setComments({ ...comments, [checkIn.id]: e.target.value })}
                      />
                      <div className="flex justify-end mt-3">
                        <Button variant="primary" onClick={() => handleComment(checkIn.id)}>
                          Save Feedback
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default TeamCheckIn;
