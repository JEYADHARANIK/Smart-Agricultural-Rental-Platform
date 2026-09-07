import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Tractor,
  LayoutDashboard,
  Wrench,
  CalendarCheck,
  Users,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) =>
    `flex items-center space-x-2 text-sm font-medium transition-colors px-3 py-2 rounded-lg ${isActive(path)
      ? 'bg-emerald-700 text-white shadow-sm'
      : 'text-emerald-100 hover:bg-emerald-800/60 hover:text-white'
    }`;

  return (
    <nav className="bg-emerald-900 border-b border-emerald-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo / Branding */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Tractor className="w-6 h-6 text-emerald-950" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block leading-tight text-white">
                AgriRent<span className="text-emerald-400">Hub</span>
              </span>
              <span className="text-[10px] text-emerald-300 font-medium tracking-wider uppercase block">
                Smart Equipment Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {!isAuthenticated ? (
              <>
                <Link to="/" className={linkClass('/')}>
                  Home
                </Link>
                <Link to="/login" className={linkClass('/login')}>
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/register"
                  className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md flex items-center space-x-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </Link>
              </>
            ) : user?.role === 'admin' ? (
              /* Admin Links */
              <>
                <Link to="/admin/dashboard" className={linkClass('/admin/dashboard')}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/admin/equipment" className={linkClass('/admin/equipment')}>
                  <Wrench className="w-4 h-4" />
                  <span>Equipment Management</span>
                </Link>
                <Link to="/admin/bookings" className={linkClass('/admin/bookings')}>
                  <CalendarCheck className="w-4 h-4" />
                  <span>Bookings</span>
                </Link>
                <Link to="/admin/customers" className={linkClass('/admin/customers')}>
                  <Users className="w-4 h-4" />
                  <span>Customers</span>
                </Link>
              </>
            ) : (
              /* Customer Links */
              <>
                <Link to="/customer/dashboard" className={linkClass('/customer/dashboard')}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/equipment" className={linkClass('/equipment')}>
                  <Tractor className="w-4 h-4" />
                  <span>Equipment</span>
                </Link>
                <Link to="/bookings" className={linkClass('/bookings')}>
                  <CalendarCheck className="w-4 h-4" />
                  <span>My Bookings</span>
                </Link>
              </>
            )}

            {/* Auth Info & Logout Button */}
            {isAuthenticated && (
              <div className="flex items-center pl-4 border-l border-emerald-800 space-x-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-white leading-none">
                    {user?.name}
                  </div>
                  <div className="text-[11px] text-emerald-300 font-medium capitalize mt-1 flex items-center justify-end space-x-1">
                    {user?.role === 'admin' && <ShieldCheck className="w-3 h-3 text-amber-400 inline" />}
                    <span>{user?.role}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-emerald-950/80 hover:bg-rose-900/80 text-emerald-200 hover:text-rose-200 p-2 rounded-lg transition-colors border border-emerald-700/50"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-emerald-200 hover:text-white p-2 rounded-lg focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-emerald-950 border-t border-emerald-800 px-4 pt-3 pb-4 space-y-2">
          {!isAuthenticated ? (
            <>
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className={linkClass('/')}>
                Home
              </Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className={linkClass('/login')}>
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold px-4 py-2 rounded-lg text-sm block mt-2"
              >
                Register
              </Link>
            </>
          ) : user?.role === 'admin' ? (
            <>
              <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className={linkClass('/admin/dashboard')}>
                Dashboard
              </Link>
              <Link to="/admin/equipment" onClick={() => setMobileMenuOpen(false)} className={linkClass('/admin/equipment')}>
                Equipment Management
              </Link>
              <Link to="/admin/bookings" onClick={() => setMobileMenuOpen(false)} className={linkClass('/admin/bookings')}>
                Bookings
              </Link>
              <Link to="/admin/customers" onClick={() => setMobileMenuOpen(false)} className={linkClass('/admin/customers')}>
                Customers
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left text-rose-300 hover:bg-rose-950/50 px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout ({user?.name})</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/customer/dashboard" onClick={() => setMobileMenuOpen(false)} className={linkClass('/customer/dashboard')}>
                Dashboard
              </Link>
              <Link to="/equipment" onClick={() => setMobileMenuOpen(false)} className={linkClass('/equipment')}>
                Equipment
              </Link>
              <Link to="/bookings" onClick={() => setMobileMenuOpen(false)} className={linkClass('/bookings')}>
                My Bookings
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left text-rose-300 hover:bg-rose-950/50 px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout ({user?.name})</span>
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
