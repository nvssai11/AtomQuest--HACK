import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext.jsx';
import { Button, Card, Badge, Table, Input, LoadingSpinner, EmptyState } from '../components/primitives';
import { 
  FaCogs, 
  FaFileCsv, 
  FaUnlock, 
  FaSitemap, 
  FaHistory, 
  FaPlay, 
  FaDownload, 
  FaShieldAlt, 
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Node Card */}
      <div 
        className="flex flex-col items-center border rounded-xl p-4 shadow-sm w-48 text-center relative hover:border-brand-500 hover:shadow-md transition-all duration-300"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)'
        }}
      >
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-lg mb-2 shadow-inner">
          {node.user?.name?.charAt(0) || '?'}
        </div>
        <h4 className="font-bold text-text-primary text-sm truncate w-full">{node.user?.name}</h4>
        <p className="text-[11px] text-text-secondary capitalize mb-1">{node.user?.role}</p>
        <Badge variant={node.user?.role === 'manager' ? 'brand' : 'secondary'} className="text-[9px] py-0 px-2 mt-1">
          {node.department || 'General'}
        </Badge>
        {node.children.length > 0 && (
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-bg-secondary border border-border-color flex items-center justify-center hover:bg-bg-hover transition-colors text-xs font-bold text-text-primary shadow-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)'
            }}
          >
            {isOpen ? '−' : '+'}
          </button>
        )}
      </div>

      {/* Children Connector Lines */}
      {node.children.length > 0 && isOpen && (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            marginTop: '1.5rem', 
            width: 'max-content', 
            position: 'relative' 
          }}
        >
          {/* Vertical Line down from parent */}
          <div 
            className="absolute"
            style={{ 
              backgroundColor: 'var(--border-color)',
              width: '2px',
              height: '24px',
              top: '-24px',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          ></div>
          
          {/* Horizontal connection line for multiple siblings */}
          {node.children.length > 1 && (
            <div 
              className="absolute"
              style={{ 
                backgroundColor: 'var(--border-color)',
                height: '2px',
                top: '0',
                left: '96px',
                right: '96px'
              }}
            ></div>
          )}

          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '2rem', 
              width: '100%', 
              paddingTop: '1rem' 
            }}
          >
            {node.children.map((child) => (
              <div 
                key={child.userId} 
                style={{ 
                  position: 'relative', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  paddingTop: '0.5rem' 
                }}
              >
                {/* Vertical Line up to sibling connection line */}
                <div 
                  className="absolute"
                  style={{ 
                    backgroundColor: 'var(--border-color)',
                    width: '2px',
                    height: '16px',
                    top: '-16px',
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                ></div>
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

      await api.download(`/admin/reports/download?quarter=${q}`, `achievement-report-${q}.csv`);
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
      {/* Time-Aware Premium Title Banner */}
      <div className="premium-greeting-card mb-8 animate-fade-in" style={{ background: 'var(--brand-gradient)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="greeting-time-chip" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.25)' }}>
            🛡️ HR & Admin Governance Workspace
          </div>
          <span className="text-xs text-white opacity-90 font-semibold uppercase tracking-wider">
            🕒 {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <h1 className="premium-greeting-title" style={{ color: '#ffffff' }}>
          Admin Governance Platform
        </h1>
        <p className="premium-greeting-subtitle" style={{ color: 'rgba(255, 255, 255, 0.85)', maxWidth: '700px' }}>
          Centralized command center for performance cycles, exception overrides, organization hierarchy structuring, and automated compliance auditing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Cycle Management */}
        <Card className="hover:shadow-glow transition-all duration-300 border border-brand-100/50 flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-text-primary">
                <span className="text-brand-500"><FaCogs /></span> Cycle Management
              </h2>
              <Badge variant="brand" className="animate-pulse">Active</Badge>
            </div>
            <p className="text-xs text-text-secondary mb-4">FY 2025 Performance Cycle setting and scheduling controls.</p>
            
            <div className="bg-bg-primary p-3.5 border border-border-color rounded-xl mb-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold block mb-1">Current Active Phase</span>
              <strong className="text-sm text-brand-600 block">{cycleInfo?.activePhase || '—'}</strong>
            </div>

            <div className="input-group">
              <label className="input-label text-xs">Set Target Next Phase</label>
              <select className="input-field text-xs w-full" value={nextPhase} onChange={(e) => setNextPhase(e.target.value)}>
                {['goal-setting', 'Q1', 'Q2', 'Q3', 'Q4'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-border-color/60 mt-4 flex justify-start">
            <Button variant="primary" onClick={handleProgressPhase} className="py-2 text-xs flex items-center gap-2">
              <FaPlay className="text-[10px]" /> Progress Phase
            </Button>
          </div>
        </Card>

        {/* Card 2: Compliance Reports */}
        <Card className="hover:shadow-glow transition-all duration-300 border border-brand-100/50 flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-text-primary">
                <span className="text-brand-500"><FaFileCsv /></span> Compliance Reports
              </h2>
              <Badge variant="success">Audit Ready</Badge>
            </div>
            <p className="text-xs text-text-secondary mb-4">Download system-computed employee target achievement spreadsheets.</p>
            
            <div className="bg-bg-primary p-3.5 border border-border-color rounded-xl mb-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold block mb-1">Report Context Target</span>
              <strong className="text-sm text-text-primary block">
                {['Q1', 'Q2', 'Q3', 'Q4'].includes(cycleInfo?.activePhase) ? cycleInfo.activePhase : 'Q1'} Window
              </strong>
            </div>
            
            <p className="text-[11px] text-text-secondary leading-relaxed bg-brand-50/50 text-brand-700 p-3 rounded-lg border border-brand-100/50" style={{ backgroundColor: 'var(--brand-50)', color: 'var(--brand-600)', borderColor: 'var(--brand-100)' }}>
              Generates flat records mapping planned targets, logged actuals, computed scoring percentages, and manager remarks.
            </p>
          </div>
          
          <div className="pt-4 border-t border-border-color/60 mt-4 flex justify-start">
            <Button variant="secondary" onClick={handleDownloadReport} className="w-full py-2 text-xs flex items-center justify-center gap-2 hover:bg-brand-50">
              <FaDownload /> Download Q1 Report (CSV)
            </Button>
          </div>
        </Card>

        {/* Card 3: Audit & Overrides */}
        <Card className="hover:shadow-glow transition-all duration-300 border border-warning/20 flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-text-primary">
                <span className="text-warning"><FaUnlock /></span> Audit & Overrides
              </h2>
              <Badge variant="danger">Restricted</Badge>
            </div>
            <p className="text-xs text-text-secondary mb-4">Direct database override key to force unlock locked employee goal sheets.</p>
            
            <div className="space-y-3">
              <div className="input-group mb-0">
                <Input 
                  label="Target Goal ID" 
                  placeholder="e.g. goal-004-raj-revenue" 
                  value={unlockGoalId} 
                  onChange={(e) => setUnlockGoalId(e.target.value)} 
                  className="input-field py-1 text-xs h-9"
                />
              </div>
              <div className="input-group mb-0">
                <Input 
                  label="Override Reason (min 20 chars)" 
                  placeholder="Business justification..." 
                  value={unlockReason} 
                  onChange={(e) => setUnlockReason(e.target.value)} 
                  className="input-field py-1 text-xs h-9"
                />
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border-color/60 mt-4 flex justify-start">
            <Button variant="danger" className="w-full py-2 text-xs flex items-center justify-center gap-2" onClick={handleUnlock}>
              <FaShieldAlt /> Force Unlock Goal
            </Button>
          </div>
        </Card>
      </div>

      {/* Card 4: Org Hierarchy Visualization */}
      <Card className="mb-8 border border-border-color/50 shadow-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4 border-b border-border-color pb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-brand-500"><FaSitemap /></span> Org Hierarchy Visualization
            </h2>
            <p className="text-xs text-text-secondary mt-1">Interactive reporting lines mapped dynamically from direct manager links</p>
          </div>
          
          <div className="flex bg-bg-primary border border-border-color rounded-xl p-1 shadow-inner" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 border-0 cursor-pointer ${
                activeTab === 'chart'
                  ? 'bg-brand-gradient text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary bg-transparent hover:bg-bg-hover'
              }`}
              style={{
                background: activeTab === 'chart' ? 'var(--brand-gradient)' : 'transparent',
                color: activeTab === 'chart' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <FaSitemap className="text-[10px]" /> Interactive Tree
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 border-0 cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-brand-gradient text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary bg-transparent hover:bg-bg-hover'
              }`}
              style={{
                background: activeTab === 'table' ? 'var(--brand-gradient)' : 'transparent',
                color: activeTab === 'table' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <FaHistory className="text-[10px]" /> Tabular Grid
            </button>
          </div>
        </div>

        {activeTab === 'chart' ? (
          <div className="w-full overflow-x-auto pb-8 pt-4 rounded-xl border border-border-color min-h-[400px]" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: '4rem', justifyContent: 'center', padding: '1rem' }}>
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
                <td className="font-semibold text-text-primary">{h.user?.name}</td>
                <td className="capitalize text-text-secondary">{h.user?.role}</td>
                <td className="text-xs font-mono text-text-secondary">{h.managerId || '—'}</td>
                <td>
                  <Badge variant={h.department === 'Sales' ? 'brand' : 'secondary'} className="text-[10px]">
                    {h.department || 'General'}
                  </Badge>
                </td>
              </tr>
            )}
          />
        )}
      </Card>

      {/* Card 5: Immutable Audit Ledger Timeline */}
      <Card className="mb-8 border border-border-color/50 shadow-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text-primary border-b border-border-color pb-3">
          <span className="text-xl text-brand-500"><FaHistory /></span> Immutable Audit Ledger
        </h2>
        {auditLog.length === 0 ? (
          <EmptyState icon="📜" title="No audit logs" description="No actions have been recorded yet." className="min-h-[150px]" />
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {auditLog.map((entry) => (
              <div key={entry.id} className="relative pl-8 pb-6 last:pb-0 border-l border-dashed border-border-color ml-3" style={{ borderLeftColor: 'var(--border-color)' }}>
                {/* Timeline node */}
                <div className="absolute -left-[6px] top-1 w-3 h-3 rounded-full bg-brand-500 border-2 border-bg-secondary shadow-sm" style={{ borderColor: 'var(--bg-secondary)' }}></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                      {entry.performedByName?.charAt(0) || 'A'}
                    </div>
                    <span className="font-semibold text-text-primary text-sm">{entry.performedByName}</span>
                    <Badge 
                      variant={entry.action === 'GOAL_UNLOCKED' ? 'warning' : 'brand'} 
                      className="text-[10px] py-0 px-2 uppercase font-mono"
                    >
                      {entry.action?.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-text-secondary font-mono bg-bg-primary px-1.5 py-0.5 rounded border border-border-color" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                      {entry.field}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <div className="bg-bg-primary/50 border border-border-color/60 rounded-lg p-3 mt-1.5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-2 text-xs font-mono text-text-secondary mb-2">
                    <span className="bg-danger/10 text-danger px-2 py-0.5 rounded line-through" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>{entry.oldValue}</span>
                    <span className="text-text-secondary">➔</span>
                    <span className="bg-success/10 text-success px-2 py-0.5 rounded font-bold" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>{entry.newValue}</span>
                  </div>
                  <p className="text-xs text-text-primary italic mt-1 font-medium">“{entry.reason}”</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Card 6: System Escalation Engine */}
      <Card className="border-t-4 border-t-danger shadow-md relative overflow-hidden" style={{ borderColor: 'var(--danger)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-danger rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="flex justify-between items-center mb-6 relative z-10 flex-wrap gap-4 border-b border-border-color pb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-danger">
              <span>🚨</span> System Escalation Engine
            </h2>
            <p className="text-xs text-text-secondary mt-1">System-generated escalations for overdue submissions and approvals.</p>
          </div>
          <div className="flex justify-start">
            <Button 
              variant="secondary"
              onClick={handleTriggerEscalations}
              disabled={triggering}
              className="flex items-center gap-2 py-2 text-xs"
            >
              {triggering ? <><LoadingSpinner size="sm" /> Running...</> : <><FaPlay className="text-[10px]" /> Run Engine Manually</>}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
        ) : escalations.length === 0 ? (
          <EmptyState icon="🎉" title="No Active Escalations" description="System is operating under full compliance. No submissions are overdue." className="min-h-[150px]" />
        ) : (
          <Table 
            columns={escalationColumns}
            data={escalations}
            renderRow={(esc) => (
              <tr key={esc.id}>
                <td>
                  <Badge variant={esc.status === 'open' ? 'danger' : 'success'} className="text-[10px] py-0.5 px-2">
                    {esc.status}
                  </Badge>
                </td>
                <td className="font-semibold text-text-primary">{esc.affectedUserName}</td>
                <td><code className="text-xs bg-bg-primary px-2 py-1 rounded border border-border-color text-brand-600 font-mono" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>{esc.triggerType}</code></td>
                <td className="text-xs text-text-secondary max-w-xs truncate" title={esc.notes}>{esc.notes}</td>
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
