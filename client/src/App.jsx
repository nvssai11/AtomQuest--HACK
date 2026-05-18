import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import GoalSheet from './pages/GoalSheet';

import ApprovalQueue from './pages/ApprovalQueue';
import AdminPanel from './pages/AdminPanel';
import CheckIn from './pages/CheckIn';
import Analytics from './pages/Analytics';
import TeamCheckIn from './pages/TeamCheckIn';
import Reports from './pages/Reports';

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
          />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Routes accessible by all authenticated users */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/goals" element={<GoalSheet />} />
            
            {/* Employee Routes */}
            <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
              <Route path="/checkin" element={<CheckIn />} />
            </Route>

            {/* Manager Routes */}
            <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
              <Route path="/approvals" element={<ApprovalQueue />} />
              <Route path="/team-checkin" element={<TeamCheckIn />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/analytics" element={<Analytics />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
