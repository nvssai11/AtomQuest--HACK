import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext.jsx';
import { FaLock, FaCheckCircle, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { Button, Card, Badge, Input, EmptyState, ProgressBar } from '../components/primitives';


const statusMap = {
  approved: { variant: 'success', text: 'Sheet approved and locked' },
  submitted: { variant: 'warning', text: 'Sheet submitted and awaiting review' },
  rework: { variant: 'danger', text: 'Returned for revision' },
  draft: { variant: 'brand', text: 'Draft sheet' },
};

const ApprovalStatusBanner = ({ status, isLocked }) => {
  const { variant, text } = statusMap[status] || statusMap.submitted;
  const icon = isLocked ? <FaLock className="icon-inline" /> : <FaExclamationTriangle className="icon-inline" />;

  return (
    <div className={`status-banner status-banner-${variant} mb-6`}>
      {icon}
      <span>{text}{isLocked ? ' (locked)' : ''}</span>
    </div>
  );
};

const ApprovalQueue = () => {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetDetail, setSheetDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [returnComment, setReturnComment] = useState('');
  const [goalEdits, setGoalEdits] = useState({});
  const { notify } = useNotification();

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

  const fetchPending = async () => {
    try {
      const response = await api.get('/approval/pending');
      setSheets(response || []);
    } catch (err) {
      setError(err.message || 'Unable to load approval queue.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSheetDetail = async (sheetId) => {
    setDetailLoading(true);
    setSheetDetail(null);
    try {
      const response = await api.get(`/approval/${sheetId}`);
      setSheetDetail(response);
      const edits = {};
      (response.goals || []).forEach((goal) => {
        edits[goal.id] = { target: goal.target, weightage: goal.weightage };
      });
      setGoalEdits(edits);
    } catch (err) {
      setError(err.message || 'Unable to load selected goal sheet.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  useEffect(() => {
    if (selectedSheet?.id) {
      fetchSheetDetail(selectedSheet.id);
    } else {
      setSheetDetail(null);
    }
  }, [selectedSheet?.id]);

  const handleSaveGoalEdit = async (goalId) => {
    const edit = goalEdits[goalId];
    if (!edit) return;
    const goal = goals.find((g) => g.id === goalId);
    try {
      await api.put(`/goals/${goalId}`, {
        target: goal?.uom === 'timeline' ? edit.target : Number(edit.target),
        weightage: Number(edit.weightage),
      });
      if (selectedSheet?.id) fetchSheetDetail(selectedSheet.id);
      notify.success('Goal updates saved successfully.');
    } catch (err) {
      notify.error(err.message || 'Failed to save goal update.');
    }
  };

  const handleApprove = async (sheetId) => {
    try {
      const edits = goals.map((goal) => ({
        goalId: goal.id,
        target: goal.uom === 'timeline' ? goalEdits[goal.id]?.target : Number(goalEdits[goal.id]?.target),
        weightage: Number(goalEdits[goal.id]?.weightage),
      }));
      await api.post(`/approval/${sheetId}/approve`, { edits });
      setSelectedSheet(null);
      setSheetDetail(null);
      fetchPending();
      notify.success('Goal sheet approved.');
    } catch (err) {
      notify.error(err.message || 'Failed to approve goal sheet.');
    }
  };

  const handleReturn = async (sheetId) => {
    if (!returnComment.trim()) {
      notify.error('Please provide a reason for returning the goal sheet.');
      return;
    }
    try {
      await api.post(`/approval/${sheetId}/return`, { comment: returnComment });
      setSelectedSheet(null);
      setSheetDetail(null);
      setReturnComment('');
      fetchPending();
      notify.info('Returned goal sheet with feedback.');
    } catch (err) {
      notify.error(err.message || 'Failed to return goal sheet.');
    }
  };

  if (loading) return <Layout><div className="p-8 text-text-secondary">Loading queue...</div></Layout>;
  if (error) return <Layout><EmptyState title="Error" description={error} icon="❌" /></Layout>;

  const goals = sheetDetail?.goals ?? [];
  const editedTotalWeightage = goals.reduce(
    (sum, goal) => sum + Number(goalEdits[goal.id]?.weightage ?? goal.weightage),
    0,
  );

  const approvalReady = !detailLoading && goals.length > 0 && editedTotalWeightage === 100;
  const selectedStatus = selectedSheet?.status || 'submitted';
  const pendingLabel = sheets.length === 0 ? 'All clear' : `${sheets.length} pending`;

  return (
    <Layout>
      <section className="page-header">
        <div className="page-header-text">
          <p className="meta-caption">Approval workspace</p>
          <h1>Approval Queue</h1>
          <p className="copy-secondary max-w-2xl mt-2">
            Review goal sheets from your team in one place. Validate outcomes, align weightage, and leave concise feedback before approving.
          </p>
        </div>
        <div className="summary-grid">
          <div className="dashboard-card-premium">
            <h3 className="text-text-secondary font-medium text-sm mb-2">Pending reviews</h3>
            <p className="text-3xl font-bold">{sheets.length}</p>
          </div>
          <div className="dashboard-card-premium">
            <h3 className="text-text-secondary font-medium text-sm mb-2">Selected sheet</h3>
            <p className="text-xl font-bold truncate" title={selectedSheet ? selectedSheet.employeeName : 'None'}>
              {selectedSheet ? selectedSheet.employeeName : 'None'}
            </p>
          </div>
          <div className="dashboard-card-premium">
            <h3 className="text-text-secondary font-medium text-sm mb-2">Approval readiness</h3>
            <p className={`text-xl font-bold ${approvalReady ? 'text-success' : 'text-warning'}`}>
              {approvalReady ? 'Ready' : 'Needs attention'}
            </p>
          </div>
        </div>
      </section>

      <div className="approval-layout">
        <aside className="queue-panel">
          <Card className="h-full flex flex-col">
            <div className="panel-title mb-6">
              <div>
                <h2 className="text-lg font-bold">Pending Reviews</h2>
                <p className="text-sm text-text-secondary mt-1">Select a sheet to review goals.</p>
              </div>
              <Badge variant="brand">{pendingLabel}</Badge>
            </div>

            <div className="queue-list flex-1 overflow-y-auto pr-2 space-y-3">
              {sheets.length === 0 ? (
                <EmptyState icon="🎉" title="All caught up" description="Everything is approved for now." className="min-h-[200px]" />
              ) : (
                sheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    type="button"
                    className={`queue-item text-left w-full p-4 rounded-xl border transition-all ${
                      selectedSheet?.id === sheet.id 
                        ? 'border-brand-500 bg-brand-50 shadow-md' 
                        : 'border-border-color bg-bg-secondary hover:border-brand-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedSheet(sheet)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-text-primary">{sheet.employeeName}</p>
                        <p className="text-sm text-text-secondary">{sheet.employeeDepartment}</p>
                      </div>
                      <Badge variant="warning">Submitted</Badge>
                    </div>
                    <div className="text-xs text-text-secondary">
                      <span>Cycle {sheet.year}</span> · <span>{formatDate(sheet.submittedAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </aside>

        <section className="detail-panel">
          <Card className="h-full">
            {selectedSheet ? (
              <>
                <ApprovalStatusBanner status={selectedStatus} isLocked={selectedSheet.isLocked} />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-bg-primary p-3 rounded-lg border border-border-color">
                    <span className="text-xs text-text-secondary block mb-1">Employee</span>
                    <strong className="text-sm">{selectedSheet.employeeName}</strong>
                  </div>
                  <div className="bg-bg-primary p-3 rounded-lg border border-border-color">
                    <span className="text-xs text-text-secondary block mb-1">Department</span>
                    <strong className="text-sm truncate block" title={selectedSheet.employeeDepartment}>{selectedSheet.employeeDepartment || 'General'}</strong>
                  </div>
                  <div className="bg-bg-primary p-3 rounded-lg border border-border-color">
                    <span className="text-xs text-text-secondary block mb-1">Cycle</span>
                    <strong className="text-sm">{selectedSheet.year}</strong>
                  </div>
                  <div className="bg-bg-primary p-3 rounded-lg border border-border-color">
                    <span className="text-xs text-text-secondary block mb-1">Submitted</span>
                    <strong className="text-sm">{formatDate(selectedSheet.submittedAt)}</strong>
                  </div>
                </div>

                <div className="bg-brand-50 text-brand-600 border border-brand-100 p-4 rounded-lg text-sm mb-6">
                  Use goal targets and weightage to quickly check alignment. Goals should be clear, measurable, and balanced before approval.
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-text-secondary">Total goal weightage</span>
                    <span className={`text-sm font-bold ${editedTotalWeightage === 100 ? 'text-success' : 'text-danger'}`}>{editedTotalWeightage}%</span>
                  </div>
                  <ProgressBar
                    progress={editedTotalWeightage}
                    variant={editedTotalWeightage === 100 ? 'success' : editedTotalWeightage > 100 ? 'danger' : 'warning'}
                  />
                </div>

                {detailLoading ? (
                  <div className="text-center py-8 text-text-secondary">Loading goals…</div>
                ) : goals.length === 0 ? (
                  <EmptyState icon="📝" title="No goals" description="This sheet has no goals to review." className="min-h-[200px]" />
                ) : (
                  <div className="space-y-4 mb-8">
                    {goals.map((goal) => (
                      <div key={goal.id} className="border border-border-color p-5 rounded-xl bg-bg-secondary">
                        <div className="flex justify-between items-start mb-4">
                          <div className="pr-4">
                            <h4 className="font-bold text-text-primary mb-1">{goal.title}</h4>
                            <p className="text-sm text-text-secondary">{goal.description}</p>
                          </div>
                          <Badge variant="brand">{goal.weightage}% weight</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <Input
                            label={`Target (${goal.uom})`}
                            type={goal.uom === 'timeline' ? 'date' : 'number'}
                            value={goalEdits[goal.id]?.target ?? goal.target}
                            onChange={(e) => setGoalEdits({
                              ...goalEdits,
                              [goal.id]: { ...goalEdits[goal.id], target: e.target.value },
                            })}
                          />
                          <Input
                            label="Weightage %"
                            type="number"
                            value={goalEdits[goal.id]?.weightage ?? goal.weightage}
                            onChange={(e) => setGoalEdits({
                              ...goalEdits,
                              [goal.id]: { ...goalEdits[goal.id], weightage: e.target.value },
                            })}
                          />
                        </div>

                        <div className="flex justify-end mt-4">
                          <Button variant="secondary" onClick={() => handleSaveGoalEdit(goal.id)}>
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-6 pt-6 border-t border-border-color">
                  <Input
                    as="textarea"
                    label="Return comment"
                    rows={3}
                    className="resize-none"
                    placeholder="Provide a clear reason for revision and what should improve."
                    value={returnComment}
                    onChange={(e) => setReturnComment(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="danger"
                    onClick={() => handleReturn(selectedSheet.id)}
                  >
                    <FaArrowLeft className="mr-2" /> Return for Revision
                  </Button>
                  <Button
                    variant={approvalReady ? 'success' : 'primary'}
                    disabled={!approvalReady}
                    onClick={() => handleApprove(selectedSheet.id)}
                  >
                    <FaCheckCircle className="mr-2" /> Approve & Lock
                  </Button>
                </div>

                {!approvalReady && (
                  <p className="text-xs text-danger mt-3 text-right">
                    Adjust the goal weightage until the total equals 100%. Only fully balanced sheets can be approved.
                  </p>
                )}
              </>
            ) : (
              <EmptyState icon="🧭" title="Select a sheet" description="Pick a sheet from the queue to start the review." />
            )}
          </Card>
        </section>
      </div>
    </Layout>
  );
};

export default ApprovalQueue;
