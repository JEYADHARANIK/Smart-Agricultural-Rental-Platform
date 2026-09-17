import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Equipment from './pages/Equipment';
import Bookings from './pages/Bookings';
import Customers from './pages/Customers';
import MaintenanceDashboard from './pages/MaintenanceDashboard';
import FarmerAssistant from './pages/FarmerAssistant';
import Notifications from './pages/Notifications';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-cream-50 font-sans">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Customer Protected Routes */}
              <Route
                path="/customer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/equipment"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Equipment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bookings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Bookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/customers"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Customers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/maintenance"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <MaintenanceDashboard />
                  </ProtectedRoute>
                }
              />

              {/* General Protected Routes (Accessible by both customer & admin) */}
              <Route
                path="/equipment"
                element={
                  <ProtectedRoute>
                    <Equipment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <Bookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assistant"
                element={
                  <ProtectedRoute>
                    <FarmerAssistant />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
