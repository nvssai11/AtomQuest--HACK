import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Badge, ProgressBar } from '../components/UI';
import { api } from '../api';
import { FaLock, FaCheckCircle, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';

const ApprovalQueue = () => {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetDetail, setSheetDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [returnComment, setReturnComment] = useState('');
  const [goalEdits, setGoalEdits] = useState({});

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
    } catch (err) {
      alert(err.message);
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
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReturn = async (sheetId) => {
    if (!returnComment.trim()) {
      alert('Please provide a reason for returning the goal sheet.');
      return;
    }
    try {
      await api.post(`/approval/${sheetId}/return`, { comment: returnComment });
      setSelectedSheet(null);
      setSheetDetail(null);
      setReturnComment('');
      fetchPending();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Layout><div className="p-8">Loading queue...</div></Layout>;
  if (error) return <Layout><div className="p-8 text-danger">{error}</div></Layout>;

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
          <p className="copy-secondary">
            Review goal sheets from your team in one place. Validate outcomes, align weightage, and leave concise feedback before approving.
          </p>
        </div>
        <div className="summary-grid">
          <div className="summary-card">
            <h3>Pending reviews</h3>
            <p>{sheets.length}</p>
          </div>
          <div className="summary-card">
            <h3>Selected sheet</h3>
            <p>{selectedSheet ? selectedSheet.employeeName : 'None'}</p>
          </div>
          <div className="summary-card">
            <h3>Approval readiness</h3>
            <p>{approvalReady ? 'Ready' : 'Needs attention'}</p>
          </div>
        </div>
      </section>

      <div className="approval-layout">
        <aside className="queue-panel card">
          <div className="panel-title">
            <div>
              <h2>Pending Reviews</h2>
              <p className="copy-secondary">Select a sheet to open the approval workspace and inspect individual goals.</p>
            </div>
            <span className="meta-pill">{pendingLabel}</span>
          </div>

          <div className="queue-list">
            {sheets.length === 0 ? (
              <div className="empty-state">
                <div>
                  <p className="emoji-large">🎉</p>
                  <p className="copy-secondary">Everything is approved for now.</p>
                </div>
              </div>
            ) : (
              sheets.map((sheet) => (
                <button
                  key={sheet.id}
                  type="button"
                  className={`queue-item ${selectedSheet?.id === sheet.id ? 'active' : ''}`}
                  onClick={() => setSelectedSheet(sheet)}
                >
                  <div className="item-header">
                    <div>
                      <p className="item-title">{sheet.employeeName}</p>
                      <p className="item-meta">{sheet.employeeDepartment}</p>
                    </div>
                    <Badge variant="warning">Submitted</Badge>
                  </div>
                  <div className="item-meta">
                    <span>Cycle {sheet.year}</span> · <span>{formatDate(sheet.submittedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="detail-panel card">
          {selectedSheet ? (
            <>
              <ApprovalStatusBanner status={selectedStatus} isLocked={selectedSheet.isLocked} />

              <div className="detail-grid">
                <div className="detail-row">
                  <span>Employee</span>
                  <strong>{selectedSheet.employeeName}</strong>
                </div>
                <div className="detail-row">
                  <span>Department</span>
                  <strong>{selectedSheet.employeeDepartment || 'General'}</strong>
                </div>
                <div className="detail-row">
                  <span>Cycle</span>
                  <strong>{selectedSheet.year}</strong>
                </div>
                <div className="detail-row">
                  <span>Submitted</span>
                  <strong>{formatDate(selectedSheet.submittedAt)}</strong>
                </div>
              </div>

              <div className="info-callout">
                Use goal targets and weightage to quickly check alignment. Goals should be clear, measurable, and balanced before approval.
              </div>

              <div className="progress-summary">
                <div className="progress-label">Total goal weightage</div>
                <ProgressBar
                  progress={editedTotalWeightage}
                  showLabel
                  variant={editedTotalWeightage === 100 ? 'success' : editedTotalWeightage > 100 ? 'danger' : 'warning'}
                />
              </div>

              {detailLoading ? (
                <p className="copy-secondary detail-empty-text">Loading goals…</p>
              ) : goals.length === 0 ? (
                <p className="copy-secondary">This sheet has no goals to review.</p>
              ) : (
                <div className="goal-list">
                  {goals.map((goal) => (
                    <div key={goal.id} className="goal-card">
                      <div className="goal-card-header">
                        <div>
                          <h4>{goal.title}</h4>
                          <p className="goal-card-body">{goal.description}</p>
                        </div>
                        <span className="meta-pill">{goal.weightage}% weight</span>
                      </div>

                      <div className="goal-controls">
                        <div className="input-group">
                          <label className="input-label">Target</label>
                          <input
                            type={goal.uom === 'timeline' ? 'date' : 'number'}
                            className="input-field"
                            value={goalEdits[goal.id]?.target ?? goal.target}
                            onChange={(e) => setGoalEdits({
                              ...goalEdits,
                              [goal.id]: { ...goalEdits[goal.id], target: e.target.value },
                            })}
                          />
                        </div>
                        <div className="input-group">
                          <label className="input-label">Weightage %</label>
                          <input
                            type="number"
                            className="input-field"
                            value={goalEdits[goal.id]?.weightage ?? goal.weightage}
                            onChange={(e) => setGoalEdits({
                              ...goalEdits,
                              [goal.id]: { ...goalEdits[goal.id], weightage: e.target.value },
                            })}
                          />
                        </div>
                      </div>

                      <div className="goal-card-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => handleSaveGoalEdit(goal.id)}>
                          Save changes
                        </button>
                        <small className="copy-secondary">UoM: {goal.uom}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="input-group mb-4">
                <label className="input-label" htmlFor="returnComment">Return comment</label>
                <textarea
                  id="returnComment"
                  className="input-field"
                  rows={4}
                  placeholder="Provide a clear reason for revision and what should improve."
                  value={returnComment}
                  onChange={(e) => setReturnComment(e.target.value)}
                />
              </div>

              <div className="action-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-danger"
                  onClick={() => handleReturn(selectedSheet.id)}
                >
                  <FaArrowLeft className="icon-inline" /> Return for Revision
                </button>
                <button
                  type="button"
                  className={`btn ${approvalReady ? 'btn-success' : 'btn-disabled'}`}
                  onClick={() => handleApprove(selectedSheet.id)}
                  disabled={!approvalReady}
                >
                  <FaCheckCircle className="icon-inline" /> Approve & Lock
                </button>
              </div>

              {!approvalReady && (
                <div className="approval-notice">
                  Adjust the goal weightage until the total equals 100%. Only fully balanced sheets can be approved.
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div>
                <p className="emoji-large">🧭</p>
                <p className="mt-3">Pick a sheet from the queue to start the review.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default ApprovalQueue;

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
    <div className={`status-banner status-banner-${variant}`}>
      {icon}
      <span>{text}{isLocked ? ' (locked)' : ''}</span>
    </div>
  );
};

// Add progress bar for total weightage
const ApprovalTotalWeightageBar = ({ total }) => (
  <div className="my-2">
    <ProgressBar progress={total} showLabel variant={total === 100 ? 'success' : total > 100 ? 'danger' : 'brand'} />
    <span className="text-xs ml-2">Total Weightage: {total}%</span>
  </div>
);

// SaaS-like Approval Queue Card Layout
// <div className="approval-queue-wrapper">
//   <ApprovalStatusBanner status={selectedSheet?.status || 'draft'} />
//   <div className="approval-queue-card">
//     {/* Approval Queue Header */}
//     <div className="approval-queue-header">
//       <h2 className="approval-queue-title">Manager Approval Queue</h2>
//       <span className="approval-queue-period">{selectedSheet?.year || ''}</span>
//     </div>
//     {/* Approval List */}
//     <div className="approval-list">
//       {goals.map((goal, idx) => (
//         <div className="approval-card" key={goal.id}>
//           <div className="approval-card-header">
//             <span className="approval-title">{goal.title}</span>
//             <Badge status={goal.status} tooltip={goal.statusDescription} />
//           </div>
//           <div className="approval-card-body">
//             <span className="approval-desc">{goal.description}</span>
//             <ManagerWeightageInput value={goal.weightage} onChange={handleManagerWeightageChange(idx)} error={goal.weightageError} tooltip="Weightage must be between 5 and 50" />
//           </div>
//           <div className="approval-card-footer">
//             <button className="approval-edit-btn" aria-label="Edit Approval" onClick={() => handleEditApproval(idx)}><FaEdit /></button>
//             <button className="approval-rework-btn" aria-label="Send for Rework" onClick={() => handleReworkApproval(idx)}><FaArrowLeft /></button>
//           </div>
//         </div>
//       ))}
//     </div>
//     {/* Total Weightage Progress */}
//     <ApprovalTotalWeightageBar total={editedTotalWeightage} />
//   </div>
// </div>