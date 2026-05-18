import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext.jsx';
import { Button, Card, Badge, Table, Modal, Input, LoadingSpinner, EmptyState, ProgressBar } from '../components/primitives';
import ConfirmDialog from '../components/ConfirmDialog.jsx';



const GoalSheet = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareRecipients, setShareRecipients] = useState([]);
  const { notify } = useNotification();
  
  // New Goal Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [newGoal, setNewGoal] = useState({
    title: '', description: '', thrustArea: 'Delivery', uom: 'numeric-min', target: '', weightage: ''
  });
  const [sharedGoal, setSharedGoal] = useState({
    title: '', description: '', thrustArea: 'Department KPI', uom: 'numeric-min', target: '', weightage: '', recipientIds: [],
  });

  const titleInputRef = useRef(null);

  const THRUST_AREA_OPTIONS = [
    'Delivery', 'Customer Success', 'Sales Growth', 'Department KPI',
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
      const promises = [api.get('/goals/me')];
      if (user?.role === 'manager' || user?.role === 'admin') {
        promises.push(api.get('/goals/share-recipients'));
      }
      
      const [goalsRes, recipientsRes] = await Promise.all(promises);
      
      setData(goalsRes);
      if (recipientsRes) {
        setShareRecipients(recipientsRes || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.role]);

  useEffect(() => {
    if (isModalOpen && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isModalOpen]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    const nextWeightage = Number(newGoal.weightage);
    
    if (nextWeightage < 10) {
      notify.error('Individual goal weightage must be at least 10%.');
      return;
    }

    const currentWeightage = data?.goals?.reduce((sum, g) => sum + g.weightage, 0) || 0;
    if (currentWeightage + nextWeightage > 100) {
      notify.error(`Total weightage cannot exceed 100%. You only have ${Math.max(100 - currentWeightage, 0)}% remaining.`);
      return;
    }

    try {
      await api.post('/goals', {
        ...newGoal,
        target: newGoal.uom === 'timeline' ? newGoal.target : newGoal.uom === 'zero' ? 0 : Number(newGoal.target),
        weightage: nextWeightage,
      });
      closeGoalModal();
      fetchData();
      notify.success('Goal created successfully.');
    } catch (err) {
      notify.error(err.message || 'Failed to create new goal.');
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

    if (nextWeightage < 10) {
      notify.error('Individual goal weightage must be at least 10%.');
      return;
    }

    const otherWeightage = data?.goals
      ?.filter((g) => g.id !== editingGoal.id)
      .reduce((sum, g) => sum + g.weightage, 0) || 0;

    if (otherWeightage + nextWeightage > 100) {
      notify.error(`Total weightage cannot exceed 100%. This change would make it ${otherWeightage + nextWeightage}%.`);
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
      notify.success('Goal updated successfully.');
    } catch (err) {
      notify.error(err.message || 'Failed to update goal.');
    }
  };

  const handlePushSharedGoal = async (e) => {
    e.preventDefault();
    if (sharedGoal.recipientIds.length === 0) {
      notify.error('Select at least one employee.');
      return;
    }

    try {
      await api.post('/goals/shared', {
        ...sharedGoal,
        target: sharedGoal.uom === 'timeline' ? sharedGoal.target : sharedGoal.uom === 'zero' ? 0 : Number(sharedGoal.target),
        weightage: Number(sharedGoal.weightage),
      });
      api.invalidateCache('/goals/share-recipients'); // Invalidate stale capacity cache
      setIsShareModalOpen(false);
      setSharedGoal({ title: '', description: '', thrustArea: 'Department KPI', uom: 'numeric-min', target: '', weightage: '', recipientIds: [] });
      fetchData();
      notify.success('Shared goal pushed successfully.');
    } catch (err) {
      notify.error(err.message || 'Failed to push shared goal.');
    }
  };

  const handleSubmitSheet = async () => {
    try {
      await api.post(`/goals/sheet/${data.sheet.id}/submit`);
      setConfirmSubmitOpen(false);
      fetchData();
      notify.success('Goal sheet submitted for approval.');
    } catch (err) {
      notify.error(err.message || 'Failed to submit goal sheet.');
    }
  };

  const handleDeleteGoal = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/goals/${confirmDeleteId}`);
      setConfirmDeleteId(null);
      fetchData();
      notify.success('Goal deleted successfully.');
    } catch (err) {
      notify.error(err.message || 'Unable to delete the goal.');
    }
  };

  if (loading) return <Layout><div className="flex justify-center p-8"><LoadingSpinner size="lg" /></div></Layout>;
  if (error) return <Layout><EmptyState title="Error loading data" description={error} icon="❌" /></Layout>;

  const { sheet, goals } = data;
  const isEditable = sheet.status === 'draft' || sheet.status === 'returned';
  const canManageOwnGoals = user?.role === 'employee' || user?.role === 'manager';
  const totalWeightage = Math.round(goals.reduce((sum, g) => sum + Number(g.weightage), 0) * 100) / 100;
  const remainingWeightage = Math.round(Math.max(100 - totalWeightage, 0) * 100) / 100;
  const weightageError = totalWeightage > 100
    ? `Reduce total weightage by ${totalWeightage - 100}% before submission.`
    : totalWeightage < 100
      ? `Add ${100 - totalWeightage}% more weightage before submission.`
      : '';
  const canAddGoal = canManageOwnGoals && isEditable && goals.length < 8 && totalWeightage < 100;
  const canSubmit = canManageOwnGoals && goals.length > 0 && totalWeightage === 100;
  const canPushSharedGoal = (user?.role === 'manager' || user?.role === 'admin') && sheet.status !== 'submitted' && sheet.status !== 'approved';
  
  const addGoalDisabledReason = !canAddGoal
    ? goals.length >= 8
      ? 'You have reached the maximum of 8 goals. Remove or consolidate one goal to add another.'
      : totalWeightage >= 100
        ? 'Total weightage is already 100%. Reduce an existing goal’s weightage to free up space for a new one.'
        : 'New goals cannot be added at this time. Please check your sheet status.'
    : null;
    
  const getGoalWorkflowStatus = (goal) => {
    if (sheet.status === 'submitted') return { label: 'Pending Approval', variant: 'warning' };
    if (sheet.status === 'approved' || goal.isLocked) return { label: 'Locked', variant: 'warning' };
    return { label: 'Editable', variant: 'success' };
  };

  const columns = [
    { header: 'Title', accessor: 'title' },
    { header: 'Thrust Area', accessor: 'thrustArea' },
    { header: 'Target', accessor: 'target' },
    { header: 'Weightage', accessor: 'weightage' },
    { header: 'Status', accessor: 'status' },
    ...(isEditable && canManageOwnGoals ? [{ header: 'Actions', accessor: 'actions' }] : []),
  ];

  return (
    <Layout>
      <section className="page-header">
        <div className="page-header-text">
          <h1>My Goal Sheet</h1>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={sheet.status === 'approved' ? 'success' : sheet.status === 'submitted' ? 'warning' : 'brand'}>
              {sheet.status}
            </Badge>
            <span className="meta-caption">Performance Cycle: {sheet.year}</span>
          </div>
        </div>

        {isEditable && (canManageOwnGoals || canPushSharedGoal) && (
          <div className="page-header-actions">
            {canPushSharedGoal && (
              <Button variant="secondary" onClick={() => setIsShareModalOpen(true)}>
                Push Shared Goal
              </Button>
            )}
            {canManageOwnGoals && (
              <>
                <Button 
                  variant="secondary"
                  onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
                  disabled={!canAddGoal}
                  title={addGoalDisabledReason || 'Add a new goal'}
                >
                  + Add Goal
                </Button>
                <Button variant="primary" onClick={() => setConfirmSubmitOpen(true)} disabled={!canSubmit}>
                  Submit for Approval
                </Button>
              </>
            )}
          </div>
        )}
      </section>

      {addGoalDisabledReason && (
        <div className="bg-warning-bg border border-warning/30 text-warning px-4 py-3 rounded-lg text-sm max-w-xl mb-4">
          {addGoalDisabledReason}
        </div>
      )}

      {sheet.returnComment && (
        <div className="bg-warning-bg border border-warning/30 p-4 rounded-lg mb-6">
          <p className="text-sm font-bold text-warning">Manager returned with comment:</p>
          <p className="text-sm text-warning mt-1">{sheet.returnComment}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl">
        <div className="dashboard-card-premium">
          <p className="text-sm text-text-secondary mb-1">Total Goals</p>
          <p className="text-2xl font-bold mb-3">{goals.length} / 8</p>
          <ProgressBar progress={(goals.length / 8) * 100} variant="brand" />
        </div>
        <div className="dashboard-card-premium">
          <p className="text-sm text-text-secondary mb-1">Total Weightage</p>
          <p className={`text-2xl font-bold mb-3 ${totalWeightage === 100 ? 'text-success' : 'text-danger'}`}>
            {totalWeightage}%
          </p>
          {weightageError && <p className="text-xs text-danger mt-2 mb-3">{weightageError}</p>}
          <ProgressBar progress={totalWeightage} variant={totalWeightage === 100 ? 'success' : 'danger'} />
        </div>
      </div>

      <Table 
        columns={columns}
        data={goals}
        renderRow={(goal) => {
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
                    <button type="button" className="text-xs text-brand-600 hover:underline font-medium" onClick={() => openEditModal(goal)}>Edit</button>
                    <button type="button" className="text-xs text-danger hover:underline font-medium" onClick={() => setConfirmDeleteId(goal.id)}>Delete</button>
                  </div>
                </td>
              )}
            </tr>
          );
        }}
      />

      <ConfirmDialog
        open={confirmSubmitOpen}
        title="Submit goal sheet"
        message="Are you sure you want to submit this goal sheet for manager approval? Once submitted, edits will be limited."
        confirmText="Submit"
        cancelText="Cancel"
        onConfirm={handleSubmitSheet}
        onCancel={() => setConfirmSubmitOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete goal"
        message="Are you sure you want to delete this goal? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteGoal}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Goal create/edit modal */}
      <Modal isOpen={isModalOpen} onClose={closeGoalModal} title={editingGoal ? 'Edit Goal' : 'Add New Goal'}>
        <form onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal} className="space-y-4">
          {editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id && (
            <div className="bg-brand-50 border border-brand-100 text-brand-600 p-3 rounded-lg mb-4 text-sm">
              This is a shared goal. You can adjust only weightage; title and target are read-only.
            </div>
          )}
          <Input
            label="Title"
            ref={titleInputRef}
            required
            disabled={editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id}
            value={newGoal.title}
            onChange={e => setNewGoal({...newGoal, title: e.target.value})}
            placeholder="e.g. Improve engineer productivity"
          />
          <Input
            as="textarea"
            label="Description"
            required
            rows="3"
            className="resize-none"
            disabled={editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id}
            value={newGoal.description}
            onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            placeholder="Provide a brief goal description..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              as="select"
              label="Thrust Area"
              required
              disabled={editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id}
              value={newGoal.thrustArea}
              onChange={(e) => setNewGoal({ ...newGoal, thrustArea: e.target.value })}
            >
              {THRUST_AREA_OPTIONS.map((area) => <option key={area} value={area}>{area}</option>)}
            </Input>
            <Input
              as="select"
              label="Unit of Measure"
              required
              disabled={editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id}
              value={newGoal.uom}
              onChange={(e) => setNewGoal({ ...newGoal, uom: e.target.value, target: e.target.value === 'zero' ? '0' : '' })}
            >
              {UOM_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Input>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={newGoal.uom === 'timeline' ? 'Target Date' : newGoal.uom === 'zero' ? 'Target (Zero)' : newGoal.uom.includes('percent') ? 'Target (%)' : 'Target'}
              required
              type={newGoal.uom === 'timeline' ? 'date' : 'number'}
              min={newGoal.uom.includes('percent') || newGoal.uom === 'zero' ? '0' : undefined}
              max={newGoal.uom.includes('percent') || newGoal.uom === 'zero' ? '100' : undefined}
              disabled={newGoal.uom === 'zero' || (editingGoal?.isShared && editingGoal.primaryOwnerId !== user?.id)}
              value={newGoal.uom === 'zero' ? '0' : newGoal.target}
              onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
              placeholder={newGoal.uom === 'timeline' ? '' : 'Target value'}
            />
            <div>
              <Input
                label="Weightage (%)"
                required
                type="number"
                min="10"
                max={editingGoal ? 100 - goals.filter((g) => g.id !== editingGoal.id).reduce((sum, g) => sum + g.weightage, 0) : remainingWeightage}
                value={newGoal.weightage}
                onChange={e => setNewGoal({...newGoal, weightage: e.target.value})}
              />
              <p className="text-xs mt-1 font-medium">
                <span className={Number(newGoal.weightage) > (editingGoal ? Math.round((100 - goals.filter((g) => g.id !== editingGoal.id).reduce((sum, g) => sum + Number(g.weightage), 0))*100)/100 : remainingWeightage) ? 'text-danger' : 'text-text-secondary'}>
                  Available: {editingGoal ? Math.round((100 - goals.filter((g) => g.id !== editingGoal.id).reduce((sum, g) => sum + Number(g.weightage), 0))*100)/100 : remainingWeightage}%
                </span>
              </p>
              {Number(newGoal.weightage) > 0 && (
                 <p className="text-xs text-brand-600 mt-1">
                   Total will be: {Math.round((totalWeightage - (editingGoal ? Number(editingGoal.weightage) : 0) + Number(newGoal.weightage)) * 100) / 100}%
                   {Math.round((totalWeightage - (editingGoal ? Number(editingGoal.weightage) : 0) + Number(newGoal.weightage)) * 100) / 100 > 100 && ' (Exceeds 100%!)'}
                 </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={closeGoalModal} type="button">Cancel</Button>
            <Button variant="primary" type="submit">{editingGoal ? 'Update Goal' : 'Save Goal'}</Button>
          </div>
        </form>
      </Modal>

      {/* Share Goal Modal */}
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Push Shared Department KPI">
        <form onSubmit={handlePushSharedGoal} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Title" required value={sharedGoal.title} onChange={e => setSharedGoal({ ...sharedGoal, title: e.target.value })} />
            <Input as="select" label="Thrust Area" required value={sharedGoal.thrustArea} onChange={e => setSharedGoal({ ...sharedGoal, thrustArea: e.target.value })}>
              {THRUST_AREA_OPTIONS.map((area) => <option key={area} value={area}>{area}</option>)}
            </Input>
          </div>
          <Input as="textarea" label="Description" required rows="2" className="resize-none" value={sharedGoal.description} onChange={e => setSharedGoal({ ...sharedGoal, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <Input as="select" label="UoM" required value={sharedGoal.uom} onChange={e => setSharedGoal({ ...sharedGoal, uom: e.target.value, target: e.target.value === 'zero' ? '0' : '' })}>
               {UOM_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Input>
            <Input
              label={sharedGoal.uom === 'timeline' ? 'Date' : 'Target'}
              required
              type={sharedGoal.uom === 'timeline' ? 'date' : 'number'}
              min={sharedGoal.uom.includes('percent') || sharedGoal.uom === 'zero' ? '0' : undefined}
              max={sharedGoal.uom.includes('percent') || sharedGoal.uom === 'zero' ? '100' : undefined}
              disabled={sharedGoal.uom === 'zero'}
              value={sharedGoal.uom === 'zero' ? '0' : sharedGoal.target}
              onChange={e => setSharedGoal({ ...sharedGoal, target: e.target.value })}
            />
            <Input label="Weightage (%)" required type="number" min="10" max="100" value={sharedGoal.weightage} onChange={e => setSharedGoal({ ...sharedGoal, weightage: e.target.value })} />
          </div>
          <div>
            <label className="input-label mb-1 block">Recipients</label>
            <div className="max-h-40 overflow-y-auto border border-border-color rounded-lg p-3 bg-bg-secondary space-y-2">
              {shareRecipients.length === 0 ? (
                <p className="text-sm text-text-secondary">No eligible recipients found.</p>
              ) : (
                shareRecipients.map((recipient) => {
                  const defaultWeightage = Number(sharedGoal.weightage || 0);
                  const blocked = ['submitted', 'approved'].includes(recipient.sheetStatus) || (defaultWeightage > 0 && recipient.remainingWeightage < defaultWeightage);
                  return (
                    <label key={recipient.id} className={`flex items-center gap-2 text-sm ${blocked ? 'opacity-60' : ''}`}>
                      <input
                        type="checkbox"
                        disabled={blocked}
                        checked={sharedGoal.recipientIds.includes(recipient.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...sharedGoal.recipientIds, recipient.id]
                            : sharedGoal.recipientIds.filter((id) => id !== recipient.id);
                          setSharedGoal({ ...sharedGoal, recipientIds: ids });
                        }}
                      />
                      <span>
                        {recipient.name}
                        <span className="text-text-secondary"> (remaining {recipient.remainingWeightage}%)</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" type="button" onClick={() => setIsShareModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Push KPI</Button>
          </div>
        </form>
      </Modal>

    </Layout>
  );
};

export default GoalSheet;