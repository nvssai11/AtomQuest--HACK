import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { api } from '../api';
import { Card, LoadingSpinner, EmptyState } from '../components/primitives';

const DashboardCard = ({ title, value, subtitle, icon, trend }) => (
  <div className="dashboard-card-premium">
    <div className="flex items-start justify-between mb-4">
      <div className="dashboard-card-icon-wrap">
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
  const [cycleInfo, setCycleInfo] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [activityData, cycleData] = await Promise.all([
          api.get('/audit/recent?limit=8'),
          api.get('/cycle/current')
        ]);
        setActivity(activityData || []);
        setCycleInfo(cycleData);
      } catch {
        setActivity([]);
        setCycleInfo({ activePhase: 'Q1', year: 2025 });
      } finally {
        setActivityLoading(false);
      }
    };
    loadData();
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
          <DashboardCard 
            title="Current Phase" 
            value={cycleInfo?.activePhase || 'Q1'} 
            subtitle={cycleInfo?.activePhase === 'goal-setting' ? 'Goal creation & submission' : `${cycleInfo?.activePhase || 'Q1'} check-in window`} 
            icon="📈" 
          />
          <DashboardCard title="Portal" value="Active" subtitle={`FY ${cycleInfo?.year || '2025'} performance cycle`} icon="⏱️" />
        </div>
      )}

      {role === 'manager' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DashboardCard title="Your Queue" value="Approvals" subtitle="Review direct reports' sheets" icon="⏳" />
          <DashboardCard 
            title="Current Phase" 
            value={cycleInfo?.activePhase || 'Q1'} 
            subtitle={cycleInfo?.activePhase === 'goal-setting' ? 'Review & approvals in progress' : `Team ${cycleInfo?.activePhase || 'Q1'} check-ins`} 
            icon="👥" 
          />
          <DashboardCard title="Actions" value="Review" subtitle="Approve or return goal sheets" icon="✓" />
        </div>
      )}

      {role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <DashboardCard title="Governance" value="Admin" subtitle="Cycles, unlocks, reports" icon="🏢" />
          <DashboardCard title="Reports" value="CSV" subtitle={`${cycleInfo?.activePhase || 'Q1'} achievement export`} icon="📊" />
          <DashboardCard title="Escalations" value="Monitor" subtitle="Overdue submissions" icon="🚨" />
          <DashboardCard 
            title="Current Phase" 
            value={cycleInfo?.activePhase || 'Q1'} 
            subtitle={`Performance Cycle ${cycleInfo?.year || '2025'}`} 
            icon="📅" 
          />
        </div>
      )}

      <Card className="border-t-4 border-t-brand-500">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        {activityLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : activity.length === 0 ? (
          <EmptyState 
            title="No recent activity" 
            description="Audit events and recent actions will appear here." 
            icon="📭" 
          />
        ) : (
          <div className="activity-timeline">
            {activity.map((entry) => (
              <div
                key={entry.id}
                className="activity-item-premium"
              >
                <div className="activity-avatar">
                  {entry.performedByName?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {entry.performedByName} {formatAuditAction(entry)}
                  </p>
                  {entry.reason && (
                    <p className="text-sm text-text-secondary mt-1">{entry.reason}</p>
                  )}
                  <span className="text-xs text-text-secondary mt-2 block">
                    🕒 {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default Dashboard;

