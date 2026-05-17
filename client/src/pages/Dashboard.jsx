import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { api } from '../api';

const DashboardCard = ({ title, value, subtitle, icon, trend }) => (
  <div className="card flex flex-col h-full">
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl text-brand-600">
        {icon}
      </div>
      {trend !== undefined && trend !== null && (
        <span className={`text-sm font-medium ${trend > 0 ? 'text-success' : 'text-danger'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-text-secondary font-medium text-sm mb-1">{title}</h3>
    <div className="text-3xl font-bold text-text-primary mb-2">{value}</div>
    {subtitle && <p className="text-xs text-text-secondary mt-auto">{subtitle}</p>}
  </div>
);

const formatAuditAction = (entry) => {
  const labels = {
    FIELD_UPDATED: `updated ${entry.field} on a goal`,
    GOAL_UNLOCKED: 'unlocked a goal for revision',
  };
  return labels[entry.action] || entry.action;
};

const formatTimestamp = (iso) => {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString();
};

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.role;
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const data = await api.get('/audit/recent?limit=8');
        setActivity(data || []);
      } catch {
        setActivity([]);
      } finally {
        setActivityLoading(false);
      }
    };
    loadActivity();
  }, []);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-text-secondary">
          Here&apos;s what&apos;s happening with your goals and team this quarter.
        </p>
      </div>

      {role === 'employee' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DashboardCard title="My Role" value="Employee" subtitle="Goal sheet & check-ins" icon="🎯" />
          <DashboardCard title="Current Phase" value="Q1" subtitle="Quarterly check-in window" icon="📈" />
          <DashboardCard title="Portal" value="Active" subtitle="FY 2025 performance cycle" icon="⏱️" />
        </div>
      )}

      {role === 'manager' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DashboardCard title="Your Queue" value="Approvals" subtitle="Review direct reports' sheets" icon="⏳" />
          <DashboardCard title="Current Phase" value="Q1" subtitle="Team check-ins in progress" icon="👥" />
          <DashboardCard title="Actions" value="Review" subtitle="Approve or return goal sheets" icon="✓" />
        </div>
      )}

      {role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <DashboardCard title="Governance" value="Admin" subtitle="Cycles, unlocks, reports" icon="🏢" />
          <DashboardCard title="Reports" value="CSV" subtitle="Q1 achievement export" icon="📊" />
          <DashboardCard title="Escalations" value="Monitor" subtitle="Overdue submissions" icon="🚨" />
          <DashboardCard title="Current Phase" value="Q1" subtitle="Performance Cycle 2025" icon="📅" />
        </div>
      )}

      <div className="card border-t-4 border-t-brand-500">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        {activityLoading ? (
          <p className="text-sm text-text-secondary">Loading activity...</p>
        ) : activity.length === 0 ? (
          <p className="text-sm text-text-secondary">No audit events yet.</p>
        ) : (
          <div className="space-y-4">
            {activity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-4 pb-4 border-b border-border-color last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold shrink-0 text-sm">
                  {entry.performedByName?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {entry.performedByName} {formatAuditAction(entry)}
                  </p>
                  {entry.reason && (
                    <p className="text-sm text-text-secondary">{entry.reason}</p>
                  )}
                  <span className="text-xs text-text-secondary mt-1 block">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;

