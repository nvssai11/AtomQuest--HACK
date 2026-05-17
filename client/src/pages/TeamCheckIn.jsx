import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Badge } from '../components/UI';
import { api } from '../api';

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

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/checkins/team?quarter=${quarter}`);
      setTeam(data || []);
    } catch (err) {
      alert(err.message);
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
      alert('Comment must be at least 10 characters.');
      return;
    }
    try {
      await api.post(`/checkins/${checkinId}/comment`, { comment });
      alert('Check-in comment saved.');
      fetchTeam();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Team Check-Ins</h1>
          <p className="text-text-secondary">Review planned vs. actual and document quarterly discussions.</p>
        </div>
        <select className="input-field w-auto" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading team data...</p>
      ) : team.length === 0 ? (
        <div className="card text-center py-8 text-text-secondary">No direct reports found.</div>
      ) : (
        <div className="space-y-6">
          {team.map(({ employee, sheet, goals, checkIn }) => (
            <div key={employee.id} className="card border-l-4 border-l-brand-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-bold">{employee.name}</h2>
                  <p className="text-sm text-text-secondary">{employee.department} • Sheet: {sheet?.status || 'n/a'}</p>
                </div>
                <Badge variant={checkIn ? 'success' : 'warning'}>
                  {checkIn ? `${quarter} Submitted` : 'Pending'}
                </Badge>
              </div>

              {!checkIn ? (
                <p className="text-sm text-text-secondary">No check-in submitted for {quarter} yet.</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {goals.map((goal) => {
                      const entry = checkIn.entries?.find((e) => e.goalId === goal.id);
                      return (
                        <div key={goal.id} className="p-3 bg-bg-secondary rounded-lg border border-border-color text-sm">
                          <p className="font-medium">{goal.title}</p>
                          <div className="flex flex-wrap gap-4 mt-2 text-xs">
                            <span>Target: <strong>{goal.target}</strong></span>
                            <span>Actual: <strong>{entry?.actualAchievement ?? '—'}</strong></span>
                            <span>Score: <strong>{entry?.computedScore ?? '—'}%</strong></span>
                            <span>Status: <strong>{STATUS_LABELS[entry?.status] || entry?.status || '—'}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {checkIn.managerComment ? (
                    <div className="bg-brand-50 p-3 rounded text-sm mb-3">
                      <p className="font-semibold text-brand-600">Your comment:</p>
                      <p>{checkIn.managerComment}</p>
                    </div>
                  ) : (
                    <div className="border-t border-border-color pt-4">
                      <label className="input-label">Check-in Comment</label>
                      <textarea
                        className="input-field min-h-[80px] mb-2"
                        placeholder="Document the quarterly discussion (min 10 chars)..."
                        value={comments[checkIn.id] || ''}
                        onChange={(e) => setComments({ ...comments, [checkIn.id]: e.target.value })}
                      />
                      <button type="button" className="btn btn-primary" onClick={() => handleComment(checkIn.id)}>
                        Save Comment
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default TeamCheckIn;

