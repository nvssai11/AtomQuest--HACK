import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext.jsx';
import { Button, Card, Badge, Table, Input, LoadingSpinner, EmptyState } from '../components/primitives';

const buildTree = (users) => {
  const map = {};
  users.forEach((u) => {
    map[u.userId] = { ...u, children: [] };
  });
  const roots = [];
  users.forEach((u) => {
    if (u.managerId && map[u.managerId]) {
      map[u.managerId].children.push(map[u.userId]);
    } else {
      roots.push(map[u.userId]);
    }
  });
  return roots;
};

const TreeNode = ({ node }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div className="flex flex-col items-center bg-bg-primary border border-border-color rounded-xl p-4 shadow-sm w-48 text-center relative hover:border-brand-500 hover:shadow-md transition-all duration-300">
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-lg mb-2">
          {node.user?.name?.charAt(0) || '?'}
        </div>
        <h4 className="font-bold text-text-primary text-sm truncate w-full">{node.user?.name}</h4>
        <p className="text-xs text-text-secondary capitalize mb-1">{node.user?.role}</p>
        <Badge variant={node.user?.role === 'manager' ? 'brand' : 'secondary'} className="text-[10px] py-0 px-2 mt-1">
          {node.department || 'General'}
        </Badge>
        {node.children.length > 0 && (
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-bg-secondary border border-border-color flex items-center justify-center hover:bg-bg-hover transition-colors text-xs font-bold text-text-primary shadow-sm"
          >
            {isOpen ? '−' : '+'}
          </button>
        )}
      </div>

      {/* Children Connector Lines */}
      {node.children.length > 0 && isOpen && (
        <div className="flex flex-col items-center mt-6 w-full relative">
          {/* Vertical Line down from parent */}
          <div className="absolute top-[-24px] left-1/2 w-[2px] h-[24px] bg-border-color"></div>
          
          {/* Horizontal connection line for multiple siblings */}
          {node.children.length > 1 && (
            <div className="absolute top-0 left-[calc(100%/12)] right-[calc(100%/12)] h-[2px] bg-border-color"></div>
          )}

          <div className="flex justify-center gap-8 w-full pt-4">
            {node.children.map((child) => (
              <div key={child.userId} className="relative flex justify-center pt-2">
                {/* Vertical Line up to sibling connection line */}
                <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 w-[2px] h-[16px] bg-border-color"></div>
                <TreeNode node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [activeTab, setActiveTab] = useState('chart');

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

  const handleDownloadReport = async () => {
    try {
      const q = ['Q1', 'Q2', 'Q3', 'Q4'].includes(cycleInfo?.activePhase) ? cycleInfo.activePhase : 'Q1';

      // Pre-flight: check if there is any data to download for this quarter
      try {
        const stats = await api.get(`/admin/reports/completion?quarter=${q}`);
        if (stats && stats.submittedCount === 0) {
          notify.error(`No check-in data found for ${q}. Ask employees to submit their check-ins first.`);
          return;
        }
      } catch (_) {
        // If the pre-flight fails, proceed anyway — don't block the download
      }

      await api.download(`/admin/reports/download?quarter=${q}`);
      notify.success(`Successfully downloaded ${q} achievement report (CSV).`);
    } catch (err) {
      notify.error(err.message || 'Failed to download report.');
    }
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
      <div className="mb-8 p-6 bg-gradient-to-r from-brand-900 to-slate-900 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
            <span className="bg-white/20 p-2 rounded-lg backdrop-blur-md">👑</span> 
            Admin Governance Platform
          </h1>
          <p className="text-brand-100 max-w-2xl text-sm leading-relaxed">
            Centralized command center for system cycles, exception handling, and compliance reporting. All actions performed here are etched into the immutable audit ledger.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cycle Management Card */}
        <Card className="hover:shadow-glow transition-all duration-300 border border-brand-100/50">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">⚙️</span> Cycle Management
            </h2>
            <Badge variant="brand" className="animate-pulse">Active</Badge>
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
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span>📊</span> Compliance Reports
              </h3>
              <p className="text-xs text-text-secondary mb-4">Download full CSV reports of goal achievements and UoM scoring.</p>
              <Button variant="primary" onClick={handleDownloadReport} className="w-full justify-center shadow-md">
                Download {['Q1', 'Q2', 'Q3', 'Q4'].includes(cycleInfo?.activePhase) ? cycleInfo.activePhase : 'Q1'} Achievement Report (CSV)
              </Button>
            </div>
          </div>
        </Card>

        {/* Audit & Overrides Card */}
        <Card className="hover:shadow-glow transition-all duration-300 border border-warning/20">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">🔓</span> Audit & Overrides
            </h2>
            <Badge variant="warning" className="bg-warning/10 text-warning border border-warning/20">Restricted</Badge>
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

      <Card className="mb-8 border border-border-color/50 shadow-sm">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-2xl">🏢</span> Org Hierarchy Visualization
            </h2>
            <p className="text-xs text-text-secondary mt-1">Interactive reporting lines derived from manager mapping</p>
          </div>
          <div className="flex border border-border-color rounded-lg overflow-hidden bg-bg-secondary p-1">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'chart'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Interactive Tree
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'table'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Tabular Grid
            </button>
          </div>
        </div>

        {activeTab === 'chart' ? (
          <div className="w-full overflow-x-auto pb-8 pt-4 flex justify-center bg-bg-secondary rounded-xl border border-border-color min-h-[400px]">
            <div className="flex gap-16 justify-center p-4">
              {buildTree(hierarchy).map((root) => (
                <TreeNode key={root.userId} node={root} />
              ))}
            </div>
          </div>
        ) : (
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
        )}
      </Card>

      <Card className="mb-8 border border-border-color/50">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-xl">📜</span> Immutable Audit Trail
        </h2>
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
      <Card className="border-t-4 border-t-danger shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-danger rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-danger">
              <span className="text-xl">🚨</span> Escalation Engine
            </h2>
            <p className="text-xs text-text-secondary mt-1">System-generated escalations for overdue submissions and approvals.</p>
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
