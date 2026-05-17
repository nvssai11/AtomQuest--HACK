import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Badge, ProgressBar } from '../components/UI';
import { api } from '../api';

const Reports = () => {
  const [quarter, setQuarter] = useState('Q1');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.get(`/admin/reports/completion?quarter=${quarter}`);
        setDashboard(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quarter]);

  const handleDownload = () => {
    api.download(`/admin/reports/download?quarter=${quarter}`);
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Completion Dashboard</h1>
          <p className="text-text-secondary">Real-time view of quarterly check-in completion across the org.</p>
        </div>
        <select className="input-field w-auto" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : dashboard ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <p className="text-sm text-text-secondary">Total Employees</p>
              <p className="text-3xl font-bold">{dashboard.totalCount}</p>
            </div>
            <div className="card">
              <p className="text-sm text-text-secondary">Submitted</p>
              <p className="text-3xl font-bold text-success">{dashboard.submittedCount}</p>
            </div>
            <div className="card">
              <p className="text-sm text-text-secondary">Pending</p>
              <p className="text-3xl font-bold text-warning">{dashboard.pendingCount}</p>
            </div>
            <div className="card">
              <p className="text-sm text-text-secondary">Completion Rate</p>
              <p className="text-3xl font-bold">{dashboard.completionRate}%</p>
              <ProgressBar progress={dashboard.completionRate} variant="brand" />
            </div>
          </div>

          <div className="card mb-6">
            <button type="button" onClick={handleDownload} className="btn btn-secondary">
              Download {quarter} Achievement Report (CSV)
            </button>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold mb-4">Pending Check-ins</h2>
            {dashboard.pendingEmployees?.length === 0 ? (
              <p className="text-text-secondary text-sm">All employees have completed {quarter} check-ins.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.pendingEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td className="font-medium">{emp.name}</td>
                      <td>{emp.department}</td>
                      <td><Badge variant="warning">Pending</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <p className="text-danger">Could not load completion data.</p>
      )}
    </Layout>
  );
};

export default Reports;

