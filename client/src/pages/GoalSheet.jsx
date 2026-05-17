import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Badge, ProgressBar } from '../components/UI';
import { api } from '../api';

const GoalSheet = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New Goal Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '', description: '', thrustArea: 'Delivery', uom: 'numeric-min', target: '', weightage: ''
  });

  const THRUST_AREA_OPTIONS = [
    'Delivery',
    'Customer Success',
    'Sales Growth',
    'Department KPI',
  ];

  const UOM_OPTIONS = [
    { value: 'numeric-min', label: 'Numeric — higher is better' },
    { value: 'numeric-max', label: 'Numeric — lower is better' },
    { value: 'percent-min', label: '% — higher is better' },
    { value: 'percent-max', label: '% — lower is better' },
    { value: 'timeline', label: 'Timeline — date-based' },
    { value: 'zero', label: 'Zero-based' },
  ];

  const fetchData = async () => {
    try {
      const response = await api.get('/goals/me');
      setData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/goals', {
        ...newGoal,
        target: newGoal.uom === 'timeline' ? newGoal.target : Number(newGoal.target),
        weightage: Number(newGoal.weightage),
      });
      setIsModalOpen(false);
      setNewGoal({ title: '', description: '', thrustArea: 'Delivery', uom: 'numeric-min', target: '', weightage: '' });
      fetchData(); // Refresh list
    } catch (err) {
      alert(err.message); // Simple error handling for hackathon
    }
  };

  const handleSubmitSheet = async () => {
    if (!window.confirm('Are you sure you want to submit your goal sheet for manager approval?')) return;
    try {
      await api.post(`/goals/sheet/${data.sheet.id}/submit`);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>;
  if (error) return <Layout><div className="p-8 text-danger">{error}</div></Layout>;

  const { sheet, goals } = data;
  const isEditable = sheet.status === 'draft' || sheet.status === 'returned';
  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);

  return (
    <Layout>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">My Goal Sheet</h1>
          <div className="flex items-center gap-3">
            <Badge variant={sheet.status === 'approved' ? 'success' : sheet.status === 'submitted' ? 'warning' : 'brand'}>
              {sheet.status}
            </Badge>
            <span className="text-sm text-text-secondary">Performance Cycle: {sheet.year}</span>
          </div>
        </div>

        {isEditable && (
          <div className="flex gap-4">
            <button 
              className="btn btn-secondary" 
              onClick={() => setIsModalOpen(true)}
              disabled={goals.length >= 8}
            >
              + Add Goal
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSubmitSheet}
              disabled={goals.length === 0 || totalWeightage !== 100}
            >
              Submit for Approval
            </button>
          </div>
        )}
      </div>

      {sheet.returnComment && (
        <div className="bg-warning-bg border border-warning/30 p-4 rounded-lg mb-6">
          <p className="text-sm font-bold text-warning">Manager returned with comment:</p>
          <p className="text-sm text-warning mt-1">{sheet.returnComment}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-text-secondary mb-1">Total Goals</p>
          <p className="text-2xl font-bold">{goals.length} / 8</p>
          <ProgressBar progress={(goals.length / 8) * 100} variant="brand" />
        </div>
        <div className="card">
          <p className="text-sm text-text-secondary mb-1">Total Weightage</p>
          <p className={`text-2xl font-bold ${totalWeightage === 100 ? 'text-success' : 'text-danger'}`}>
            {totalWeightage}%
          </p>
          <ProgressBar progress={totalWeightage} variant={totalWeightage === 100 ? 'success' : 'danger'} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Thrust Area</th>
              <th>Target</th>
              <th>Weightage</th>
              <th>Status</th>
              {isEditable && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {goals.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-text-secondary py-8">
                  No goals added yet. Click "Add Goal" to get started.
                </td>
              </tr>
            ) : (
              goals.map(goal => (
                <tr key={goal.id}>
                  <td>
                    <p className="font-medium">{goal.title}</p>
                    <p className="text-xs text-text-secondary mt-1">{goal.description}</p>
                  </td>
                  <td><Badge variant="brand">{goal.thrustArea}</Badge></td>
                  <td>{goal.target} <span className="text-xs text-text-secondary">({goal.uom})</span></td>
                  <td>{goal.weightage}%</td>
                  <td>
                    {goal.isLocked ? <Badge variant="warning">Locked</Badge> : <Badge variant="success">Unlocked</Badge>}
                  </td>
                  {isEditable && !goal.isLocked && (
                    <td>
                      <button
                        type="button"
                        className="text-xs text-danger hover:underline"
                        onClick={async () => {
                          if (!window.confirm('Delete this goal?')) return;
                          try {
                            await api.delete(`/goals/${goal.id}`);
                            fetchData();
                          } catch (err) {
                            alert(err.message);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Very simple modal for Add Goal (Hackathon shortcut) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="card w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Add New Goal</h2>
            <form onSubmit={handleCreateGoal}>
              <div className="input-group">
                <label className="input-label">Title</label>
                <input required className="input-field" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} placeholder="e.g. Improve engineer productivity" />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea
                  required
                  rows="4"
                  className="input-field resize-none"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Provide a brief goal description (min 10 chars)..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Thrust Area</label>
                  <select
                    required
                    className="input-field"
                    value={newGoal.thrustArea}
                    onChange={(e) => setNewGoal({ ...newGoal, thrustArea: e.target.value })}
                  >
                    {THRUST_AREA_OPTIONS.map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Unit of Measure (UoM)</label>
                  <select
                    required
                    className="input-field"
                    value={newGoal.uom}
                    onChange={(e) => setNewGoal({ ...newGoal, uom: e.target.value, target: '' })}
                  >
                    {UOM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">
                    {newGoal.uom === 'timeline' ? 'Target Date' : newGoal.uom.includes('percent') ? 'Target (%)' : 'Target (Number)'}
                  </label>
                  <input
                    required
                    type={newGoal.uom === 'timeline' ? 'date' : 'number'}
                    className="input-field"
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                    placeholder={newGoal.uom === 'timeline' ? '' : 'Enter planned target value'}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Weightage (%)</label>
                  <input required type="number" className="input-field" value={newGoal.weightage} onChange={e => setNewGoal({...newGoal, weightage: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default GoalSheet;
