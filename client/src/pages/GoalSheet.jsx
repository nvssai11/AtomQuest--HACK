import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Badge, ProgressBar } from '../components/UI';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { FaLock, FaCheckCircle, FaExclamationTriangle, FaEdit, FaArrowLeft } from 'react-icons/fa';

const GoalSheet = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareRecipients, setShareRecipients] = useState([]);
  
  // New Goal Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '', description: '', thrustArea: 'Delivery', uom: 'numeric-min', target: '', weightage: ''
  });
  const [sharedGoal, setSharedGoal] = useState({
    title: '',
    description: '',
    thrustArea: 'Department KPI',
    uom: 'numeric-min',
    target: '',
    weightage: '',
    recipientIds: [],
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

  useEffect(() => {
    if (user?.role === 'manager' || user?.role === 'admin') {
      api.get('/goals/share-recipients')
        .then((recipients) => setShareRecipients(recipients || []))
        .catch(() => setShareRecipients([]));
    }
  }, [user?.role]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    const nextWeightage = Number(newGoal.weightage);
    const currentWeightage = data?.goals?.reduce((sum, g) => sum + g.weightage, 0) || 0;
    if (currentWeightage + nextWeightage > 100) {
      alert(`Total weightage cannot exceed 100%. You only have ${Math.max(100 - currentWeightage, 0)}% remaining.`);
      return;
    }

    try {
      await api.post('/goals', {
        ...newGoal,
        target: newGoal.uom === 'timeline' ? newGoal.target : newGoal.uom === 'zero' ? 0 : Number(newGoal.target),
        weightage: nextWeightage,
      });
      setIsModalOpen(false);
      setNewGoal({ title: '', description: '', thrustArea: 'Delivery', uom: 'numeric-min', target: '', weightage: '' });
      fetchData(); // Refresh list
    } catch (err) {
      alert(err.message); // Simple error handling for hackathon
    }
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setNewGoal({
      title: goal.title,
      description: goal.description,
      thrustArea: goal.thrustArea,
      uom: goal.uom,
      target: String(goal.target),
      weightage: String(goal.weightage),
    });
    setIsModalOpen(true);
  };

  const closeGoalModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
    setNewGoal({ title: '', description: '', thrustArea: 'Delivery', uom: 'numeric-min', target: '', weightage: '' });
  };

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    const nextWeightage = Number(newGoal.weightage);
    const otherWeightage = data?.goals
      ?.filter((g) => g.id !== editingGoal.id)
      .reduce((sum, g) => sum + g.weightage, 0) || 0;

    if (otherWeightage + nextWeightage > 100) {
      alert(`Total weightage cannot exceed 100%. This change would make it ${otherWeightage + nextWeightage}%.`);
      return;
    }

    const isRecipientSharedGoal = editingGoal.isShared && editingGoal.primaryOwnerId !== user?.id;
    const payload = isRecipientSharedGoal
      ? { weightage: nextWeightage }
      : {
          ...newGoal,
          target: newGoal.uom === 'timeline' ? newGoal.target : newGoal.uom === 'zero' ? 0 : Number(newGoal.target),
          weightage: nextWeightage,
        };

    try {
      await api.put(`/goals/${editingGoal.id}`, payload);
      closeGoalModal();
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePushSharedGoal = async (e) => {
    e.preventDefault();
    if (sharedGoal.recipientIds.length === 0) {
      alert('Select at least one employee.');
      return;
    }

    try {
      await api.post('/goals/shared', {
        ...sharedGoal,
        target: sharedGoal.uom === 'timeline' ? sharedGoal.target : sharedGoal.uom === 'zero' ? 0 : Number(sharedGoal.target),
        weightage: Number(sharedGoal.weightage),
      });
      setIsShareModalOpen(false);
      setSharedGoal({
        title: '',
        description: '',
        thrustArea: 'Department KPI',
        uom: 'numeric-min',
        target: '',
        weightage: '',
        recipientIds: [],
      });
      fetchData();
      alert('Shared goal pushed successfully.');
    } catch (err) {
      alert(err.message);
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
  const canManageOwnGoals = user?.role === 'employee' || user?.role === 'manager';
  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
  const remainingWeightage = Math.max(100 - totalWeightage, 0);
  const weightageError = totalWeightage > 100
    ? `Reduce total weightage by ${totalWeightage - 100}% before submission.`
    : totalWeightage < 100
      ? `Add ${100 - totalWeightage}% more weightage before submission.`
      : '';
  const canAddGoal = canManageOwnGoals && isEditable && goals.length < 8 && totalWeightage < 100;
  const canSubmit = canManageOwnGoals && goals.length > 0 && totalWeightage === 100;
  const canPushSharedGoal = (user?.role === 'manager' || user?.role === 'admin') && sheet.status !== 'submitted' && sheet.status !== 'approved';
  const getGoalWorkflowStatus = (goal) => {
    if (sheet.status === 'submitted') {
      return { label: 'Pending Approval', variant: 'warning' };
    }
    if (sheet.status === 'approved' || goal.isLocked) {
      return { label: 'Locked', variant: 'warning' };
    }
    return { label: 'Editable', variant: 'success' };
  };

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

        {isEditable && (canManageOwnGoals || canPushSharedGoal) && (
          <div className="flex gap-4">
            {canPushSharedGoal && (
              <button
                className="btn btn-secondary"
                onClick={() => setIsShareModalOpen(true)}
              >
                Push Shared Goal
              </button>
            )}
            {canManageOwnGoals && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingGoal(null);
                    setIsModalOpen(true);
                  }}
                  disabled={!canAddGoal}
                >
                  + Add Goal
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitSheet}
                  disabled={!canSubmit}
                >
                  Submit for Approval
                </button>
              </>
            )}
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
          {weightageError && (
            <p className="text-xs text-danger mt-2">{weightageError}</p>
          )}
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
              {isEditable && canManageOwnGoals && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {goals.length === 0 ? (
              <tr>
                <td colSpan={isEditable && canManageOwnGoals ? 6 : 5} className="text-center text-text-secondary py-8">
                  No goals added yet. Click "Add Goal" to get started.
                </td>
              </tr>
            ) : (
              goals.map(goal => {
                const workflowStatus = getGoalWorkflowStatus(goal);
                return (
                  <tr key={goal.id}>
                    <td>
                      <p className="font-medium">{goal.title}</p>
                      <p className="text-xs text-text-secondary mt-1">{goal.description}</p>
                    </td>
                    <td><Badge variant="brand">{goal.thrustArea}</Badge></td>
                    <td>{goal.target} <span className="text-xs text-text-secondary">({goal.uom})</span></td>
                    <td>{goal.weightage}%</td>
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={workflowStatus.variant}>{workflowStatus.label}</Badge>
                        {goal.isShared && <Badge variant="brand">Shared</Badge>}
                      </div>
                    </td>
                    {isEditable && canManageOwnGoals && !goal.isLocked && (
                      <td>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className="text-xs text-brand-600 hover:underline"
                            onClick={() => openEditModal(goal)}
                          >
                            Edit
                          </button>
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
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Goal create/edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="card w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">{editingGoal ? 'Edit Goal' : 'Add New Goal'}</h2>
            <form onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}>
              {editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id && (
                <div className="bg-brand-50 border border-brand-100 text-brand-600 p-3 rounded-lg mb-4 text-sm">
                  This is a shared goal. You can adjust only weightage; title and target are read-only.
                </div>
              )}
              <div className="input-group">
                <label className="input-label">Title</label>
                <input required disabled={editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id} className="input-field" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} placeholder="e.g. Improve engineer productivity" />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea
                  required
                  rows="4"
                  className="input-field resize-none"
                  disabled={editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id}
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
                    disabled={editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id}
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
                    disabled={editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id}
                    value={newGoal.uom}
                    onChange={(e) => setNewGoal({ ...newGoal, uom: e.target.value, target: e.target.value === 'zero' ? '0' : '' })}
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
                    {newGoal.uom === 'timeline' ? 'Target Date' : newGoal.uom === 'zero' ? 'Target (Zero)' : newGoal.uom.includes('percent') ? 'Target (%)' : 'Target (Number)'}
                  </label>
                  <input
                    required
                    type={newGoal.uom === 'timeline' ? 'date' : 'number'}
                    className="input-field"
                    min={newGoal.uom.includes('percent') || newGoal.uom === 'zero' ? '0' : undefined}
                    max={newGoal.uom.includes('percent') || newGoal.uom === 'zero' ? '100' : undefined}
                    disabled={newGoal.uom === 'zero' || (editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id)}
                    value={newGoal.uom === 'zero' ? '0' : newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                    placeholder={newGoal.uom === 'timeline' ? '' : 'Enter planned target value'}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Weightage (%)</label>
                  <input
                    required
                    type="number"
                    min="10"
                    max={editingGoal ? 100 - goals.filter((g) => g.id !== editingGoal.id).reduce((sum, g) => sum + g.weightage, 0) : remainingWeightage}
                    className="input-field"
                    value={newGoal.weightage}
                    onChange={e => setNewGoal({...newGoal, weightage: e.target.value})}
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Available weightage: {editingGoal ? 100 - goals.filter((g) => g.id !== editingGoal.id).reduce((sum, g) => sum + g.weightage, 0) : remainingWeightage}%
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="btn btn-secondary" onClick={closeGoalModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingGoal ? 'Update Goal' : 'Save Goal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="card w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Push Shared Department KPI</h2>
            <form onSubmit={handlePushSharedGoal}>
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">Title</label>
                  <input required className="input-field" value={sharedGoal.title} onChange={(e) => setSharedGoal({ ...sharedGoal, title: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Thrust Area</label>
                  <select required className="input-field" value={sharedGoal.thrustArea} onChange={(e) => setSharedGoal({ ...sharedGoal, thrustArea: e.target.value })}>
                    {THRUST_AREA_OPTIONS.map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea required rows="3" className="input-field resize-none" value={sharedGoal.description} onChange={(e) => setSharedGoal({ ...sharedGoal, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="input-group">
                  <label className="input-label">UoM</label>
                  <select required className="input-field" value={sharedGoal.uom} onChange={(e) => setSharedGoal({ ...sharedGoal, uom: e.target.value, target: e.target.value === 'zero' ? '0' : '' })}>
                    {UOM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{sharedGoal.uom === 'timeline' ? 'Target Date' : sharedGoal.uom === 'zero' ? 'Target (Zero)' : 'Target'}</label>
                  <input
                    required
                    type={sharedGoal.uom === 'timeline' ? 'date' : 'number'}
                    min={sharedGoal.uom.includes('percent') || sharedGoal.uom === 'zero' ? '0' : undefined}
                    max={sharedGoal.uom.includes('percent') || sharedGoal.uom === 'zero' ? '100' : undefined}
                    disabled={sharedGoal.uom === 'zero'}
                    className="input-field"
                    value={sharedGoal.uom === 'zero' ? '0' : sharedGoal.target}
                    onChange={(e) => setSharedGoal({ ...sharedGoal, target: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Default Weightage (%)</label>
                  <input required type="number" min="10" max="100" className="input-field" value={sharedGoal.weightage} onChange={(e) => setSharedGoal({ ...sharedGoal, weightage: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Recipients</label>
                <div className="max-h-40 overflow-y-auto border border-border-color rounded-lg p-3 bg-bg-secondary">
                  {shareRecipients.length === 0 ? (
                    <p className="text-sm text-text-secondary">No eligible recipients found.</p>
                  ) : (
                    shareRecipients.map((recipient) => {
                      const defaultWeightage = Number(sharedGoal.weightage || 0);
                      const blocked = ['submitted', 'approved'].includes(recipient.sheetStatus) || (defaultWeightage > 0 && recipient.remainingWeightage < defaultWeightage);
                      return (
                      <label key={recipient.id} className={`flex items-center gap-2 text-sm py-1 ${blocked ? 'opacity-60' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={blocked}
                          checked={sharedGoal.recipientIds.includes(recipient.id)}
                          onChange={(e) => {
                            const recipientIds = e.target.checked
                              ? [...sharedGoal.recipientIds, recipient.id]
                              : sharedGoal.recipientIds.filter((id) => id !== recipient.id);
                            setSharedGoal({ ...sharedGoal, recipientIds });
                          }}
                        />
                        <span>
                          {recipient.name}
                          <span className="text-text-secondary"> ({recipient.department || 'Org'}; remaining {recipient.remainingWeightage}%{recipient.sheetStatus !== 'draft' && recipient.sheetStatus !== 'returned' ? `; ${recipient.sheetStatus}` : ''})</span>
                        </span>
                      </label>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setIsShareModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Push KPI</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default GoalSheet;

// Senior-level sheet status banner with icon, color, and guidance
const SheetStatusBanner = ({ status, isLocked }) => {
  let variant = 'brand';
  let icon = null;
  let text = '';
  if (status === 'approved') {
    variant = 'success';
    icon = <FaCheckCircle className="mr-2 text-success" />;
    text = 'Sheet Approved & Locked';
  } else if (status === 'submitted') {
    variant = 'warning';
    icon = <FaExclamationTriangle className="mr-2 text-warning" />;
    text = 'Sheet Submitted - Awaiting Manager Review';
  } else if (status === 'draft') {
    variant = 'brand';
    icon = <FaEdit className="mr-2 text-brand-500" />;
    text = 'Draft - Editable';
  } else if (status === 'rework') {
    variant = 'danger';
    icon = <FaExclamationTriangle className="mr-2 text-danger" />;
    text = 'Returned for Rework';
  }
  if (isLocked) {
    icon = <FaLock className="mr-2 text-gray-500" />;
    text += ' (Locked)';
  }
  return (
    <div className={`flex items-center px-4 py-2 rounded-lg mb-4 bg-${variant}-bg border border-${variant}/30`}>
      {icon}
      <span className="font-semibold text-lg text-${variant}">{text}</span>
    </div>
  );
};

// Add inline error messages and tooltips for weightage validation
const WeightageInput = ({ value, error, onChange, min, max }) => (
  <div className="flex flex-col">
    <input
      type="number"
      min={min}
      max={max}
      step="0.01"
      value={value}
      onChange={onChange}
      className={`input ${error ? 'border-danger' : ''}`}
      aria-label="Goal Weightage"
      title={error || `Enter weightage (${min}% - ${max}%)`}
    />
    {error && <span className="text-danger text-xs mt-1">{error}</span>}
  </div>
);

// Add progress bar for total weightage
const TotalWeightageBar = ({ total }) => (
  <div className="my-2">
    <ProgressBar progress={total} showLabel variant={total === 100 ? 'success' : total > 100 ? 'danger' : 'brand'} />
    <span className="text-xs ml-2">Total Weightage: {total}%</span>
  </div>
);