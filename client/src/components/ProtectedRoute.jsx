import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-forest-900 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on user role if trying to access unauthorized route
    const fallbackPath = user.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
