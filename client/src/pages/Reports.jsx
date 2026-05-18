import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, Badge, ProgressBar, Button, Input, LoadingSpinner, EmptyState, Table } from '../components/primitives';
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
    api.download(`/admin/reports/download?quarter=${quarter}`, `achievement-report-${quarter}.csv`);
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Completion Dashboard</h1>
          <p className="text-text-secondary">Real-time view of quarterly check-in completion across the org.</p>
        </div>
        <Input as="select" className="w-auto mb-0" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </Input>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : dashboard ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="dashboard-card-premium">
              <p className="text-sm text-text-secondary mb-2">Total Employees</p>
              <p className="text-3xl font-bold">{dashboard.totalCount}</p>
            </div>
            <div className="dashboard-card-premium">
              <p className="text-sm text-text-secondary mb-2">Submitted</p>
              <p className="text-3xl font-bold text-success">{dashboard.submittedCount}</p>
            </div>
            <div className="dashboard-card-premium">
              <p className="text-sm text-text-secondary mb-2">Pending</p>
              <p className="text-3xl font-bold text-warning">{dashboard.pendingCount}</p>
            </div>
            <div className="dashboard-card-premium">
              <p className="text-sm text-text-secondary mb-2">Completion Rate</p>
              <p className="text-3xl font-bold mb-3">{dashboard.completionRate}%</p>
              <ProgressBar progress={dashboard.completionRate} variant="brand" />
            </div>
          </div>

          <Card className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary mb-1">Export Data</h2>
              <p className="text-sm text-text-secondary">Download raw check-in data for external analysis.</p>
            </div>
            <Button variant="secondary" onClick={handleDownload}>
              Download {quarter} CSV
            </Button>
          </Card>

          <Card>
            <h2 className="text-lg font-bold mb-4">Pending Check-ins</h2>
            {dashboard.pendingEmployees?.length === 0 ? (
              <EmptyState icon="✅" title="All Caught Up" description={`All employees have completed ${quarter} check-ins.`} className="py-8" />
            ) : (
              <Table
                columns={[
                  { header: 'Employee', accessor: 'name' },
                  { header: 'Department', accessor: 'department' },
                  { header: 'Status', accessor: 'status' }
                ]}
                data={dashboard.pendingEmployees}
                renderRow={(emp) => (
                  <tr key={emp.id}>
                    <td className="font-medium">{emp.name}</td>
                    <td>{emp.department}</td>
                    <td><Badge variant="warning">Pending</Badge></td>
                  </tr>
                )}
              />
            )}
          </Card>
        </>
      ) : (
        <div className="py-12"><EmptyState icon="❌" title="Error" description="Could not load completion data." /></div>
      )}
    </Layout>
  );
};

export default Reports;

