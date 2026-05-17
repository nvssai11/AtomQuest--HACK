import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Badge, ProgressBar } from '../components/UI';
import { api } from '../api';

const Analytics = () => {
  const [distribution, setDistribution] = useState(null);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [distRes, mgrRes] = await Promise.all([
          api.get('/analytics/distribution?quarter=Q1'),
          api.get('/analytics/manager-effectiveness?quarter=Q1')
        ]);
        setDistribution(distRes);
        setManagers(mgrRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <Layout><div className="p-8">Loading analytics...</div></Layout>;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Platform Analytics</h1>
        <p className="text-text-secondary">Org-wide performance distribution and manager effectiveness.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Chart (Simulated with progress bars) */}
        <div className="card">
          <h2 className="text-lg font-bold mb-6">Q1 Score Distribution</h2>
          
          <div className="space-y-6">
            {distribution && Object.entries(distribution).map(([bracket, count]) => {
              // Assume total users is ~10 for percentage calc in demo
              const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
              const percentage = (count / total) * 100;
              
              let variant = 'brand';
              if (bracket === '90-100%') variant = 'success';
              if (bracket === 'Below 70%') variant = 'danger';

              return (
                <div key={bracket}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">{bracket}</span>
                    <span className="text-sm font-bold text-text-secondary">{count} Employees</span>
                  </div>
                  <ProgressBar progress={percentage} variant={variant} />
                </div>
              );
            })}
            
            {!distribution && <p className="text-text-secondary text-sm">No data available for Q1 yet.</p>}
          </div>
        </div>

        {/* Manager Effectiveness */}
        <div className="card">
          <h2 className="text-lg font-bold mb-2">Manager Effectiveness</h2>
          <p className="text-xs text-text-secondary mb-6">Ranked by average team performance score.</p>
          
          <div className="space-y-4">
            {managers.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">Not enough check-in data to calculate effectiveness.</p>
            ) : (
              managers.map((mgr, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-border-color rounded-lg bg-bg-secondary hover:bg-brand-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <span className="font-medium text-sm">{mgr.managerName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{mgr.averageTeamScore}%</span>
                    <Badge variant={mgr.averageTeamScore >= 80 ? 'success' : 'warning'}>Avg Score</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
