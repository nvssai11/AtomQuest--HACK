import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role not authorized, redirect to dashboard
    return <Navigate to="/" replace />;
  }

  // Authorized, render child routes
  return <Outlet />;
};

export default ProtectedRoute;
