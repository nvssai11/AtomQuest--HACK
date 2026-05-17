import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext.jsx';
import { Button, Card, Badge, Table, Input, LoadingSpinner, EmptyState } from '../components/primitives';

const AdminPanel = () => {
  const [escalations, setEscalations] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [cycleInfo, setCycleInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { notify } = useNotification();
  const [triggering, setTriggering] = useState(false);
  const [unlockGoalId, setUnlockGoalId] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [nextPhase, setNextPhase] = useState('Q2');

  const fetchEscalations = async () => {
    try {
      const response = await api.get('/admin/escalations');
      setEscalations(response || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchEscalations();
      try {
        const [audit, org, cycle] = await Promise.all([
          api.get('/audit'),
          api.get('/admin/hierarchy'),
          api.get('/cycle/current'),
        ]);
        setAuditLog(audit || []);
        setHierarchy(org || []);
        setCycleInfo(cycle);
        setNextPhase(cycle?.activePhase === 'Q1' ? 'Q2' : 'Q1');
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const handleTriggerEscalations = async () => {
    setTriggering(true);
    try {
      const res = await api.post('/admin/escalations/trigger');
      notify.success(res.message || 'Escalations triggered successfully.');
      fetchEscalations();
    } catch (err) {
      notify.error(err.message || 'Failed to trigger escalations.');
    } finally {
      setTriggering(false);
    }
  };

  const handleDownloadReport = () => {
    api.download(`/admin/reports/download?quarter=${cycleInfo?.activeQuarter || 'Q1'}`);
  };

  const handleUnlock = async () => {
    if (!unlockGoalId || unlockReason.length < 20) {
      notify.error('Goal ID and reason (min 20 chars) required.');
      return;
    }
    try {
      await api.post(`/admin/goals/${unlockGoalId}/unlock`, { reason: unlockReason });
      notify.success('Goal unlocked. Action logged in audit trail.');
      setUnlockGoalId('');
      setUnlockReason('');
      const audit = await api.get('/audit');
      setAuditLog(audit || []);
    } catch (err) {
      notify.error(err.message || 'Unable to unlock goal.');
    }
  };

  const handleProgressPhase = async () => {
    try {
      await api.post('/admin/cycle/phase', { phase: nextPhase });
      const cycle = await api.get('/cycle/current');
      setCycleInfo(cycle);
      notify.success(`Cycle progressed to ${nextPhase}`);
    } catch (err) {
      notify.error(err.message || 'Failed to progress cycle phase.');
    }
  };

  const hierarchyColumns = [
    { header: 'Employee', accessor: 'employee' },
    { header: 'Role', accessor: 'role' },
    { header: 'Manager ID', accessor: 'managerId' },
    { header: 'Department', accessor: 'department' },
  ];

  const escalationColumns = [
    { header: 'Status', accessor: 'status' },
    { header: 'Affected User', accessor: 'affectedUser' },
    { header: 'Trigger', accessor: 'trigger' },
    { header: 'Notes', accessor: 'notes' },
    { header: 'Date', accessor: 'date' },
  ];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Governance</h1>
        <p className="text-text-secondary">
          Manage system cycles, resolve escalations, and download compliance reports.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cycle Management Card */}
        <Card>
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-bold">Cycle Management</h2>
            <Badge variant="success">Active</Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 border border-border-color rounded-lg bg-bg-secondary">
              <div>
                <p className="font-semibold text-sm">FY 2025 Performance Cycle</p>
                <p className="text-xs text-text-secondary">Current Phase: {cycleInfo?.activePhase || '—'}</p>
              </div>
              <div className="flex gap-2 items-center">
                <select className="input-field py-1 text-xs w-24" value={nextPhase} onChange={(e) => setNextPhase(e.target.value)}>
                  {['goal-setting', 'Q1', 'Q2', 'Q3', 'Q4'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <Button variant="secondary" onClick={handleProgressPhase} className="py-1 text-xs">Progress</Button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border-color">
              <h3 className="text-sm font-semibold mb-2">Compliance Reports</h3>
              <p className="text-xs text-text-secondary mb-3">Download full CSV reports of goal achievements and UoM scoring.</p>
              <Button variant="secondary" onClick={handleDownloadReport} className="w-full justify-center">
                Download Q1 Achievement Report (CSV)
              </Button>
            </div>
          </div>
        </Card>

        {/* Audit & Overrides Card */}
        <Card>
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-bold">Audit & Overrides</h2>
            <Badge variant="warning">Restricted</Badge>
          </div>
          
          <p className="text-xs text-text-secondary mb-4">
            Use these tools to override locked goals. All actions are permanently recorded in the immutable audit log.
          </p>
          
          <div className="space-y-3 mb-4">
            <Input 
              label="Target Goal ID" 
              placeholder="e.g. goal-004-raj-revenue" 
              value={unlockGoalId} 
              onChange={(e) => setUnlockGoalId(e.target.value)} 
            />
            <Input 
              label="Reason for Override (Required for Audit)" 
              placeholder="Business justification (min 20 chars)..." 
              value={unlockReason} 
              onChange={(e) => setUnlockReason(e.target.value)} 
            />
          </div>
          
          <Button variant="danger" className="w-full justify-center" onClick={handleUnlock}>
            Force Unlock Goal
          </Button>
        </Card>
      </div>

      <Card className="mb-8">
        <h2 className="text-lg font-bold mb-4">Org Hierarchy (managerId on user)</h2>
        <Table 
          columns={hierarchyColumns}
          data={hierarchy}
          renderRow={(h) => (
            <tr key={h.userId}>
              <td>{h.user?.name}</td>
              <td>{h.user?.role}</td>
              <td className="text-xs font-mono">{h.managerId || '—'}</td>
              <td>{h.department}</td>
            </tr>
          )}
        />
      </Card>

      <Card className="mb-8">
        <h2 className="text-lg font-bold mb-4">Immutable Audit Trail</h2>
        {auditLog.length === 0 ? (
          <EmptyState icon="📜" title="No audit logs" description="No actions have been recorded yet." className="min-h-[150px]" />
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {auditLog.map((entry) => (
              <div key={entry.id} className="text-sm border-b border-border-color pb-2 last:border-0">
                <p className="font-medium">{entry.performedByName} — {entry.action} on {entry.field}</p>
                <p className="text-text-secondary text-xs">{entry.oldValue} → {entry.newValue} • {entry.reason}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Escalation Engine */}
      <Card className="border-t-4 border-t-danger">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold">Escalation Engine</h2>
            <p className="text-xs text-text-secondary">System-generated escalations for overdue submissions and approvals.</p>
          </div>
          <Button 
            variant="secondary"
            onClick={handleTriggerEscalations}
            disabled={triggering}
          >
            {triggering ? <><LoadingSpinner size="sm" className="mr-2" /> Running...</> : 'Run Engine Manually'}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
        ) : (
          <Table 
            columns={escalationColumns}
            data={escalations}
            renderRow={(esc) => (
              <tr key={esc.id}>
                <td>
                  <Badge variant={esc.status === 'open' ? 'danger' : 'success'}>
                    {esc.status}
                  </Badge>
                </td>
                <td className="font-medium">{esc.affectedUserName}</td>
                <td><code className="text-xs bg-bg-secondary p-1 rounded border border-border-color">{esc.triggerType}</code></td>
                <td className="text-xs max-w-xs truncate" title={esc.notes}>{esc.notes}</td>
                <td className="text-xs text-text-secondary">
                  {new Date(esc.escalatedAt).toLocaleDateString()}
                </td>
              </tr>
            )}
          />
        )}
      </Card>
    </Layout>
  );
};

export default AdminPanel;
