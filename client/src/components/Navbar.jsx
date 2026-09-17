import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
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
  ShieldCheck,
  Bell,
  Bot
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Track unread notification count for the bell badge
  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      if (!isAuthenticated) {
        setUnreadCount(0);
        return;
      }
      try {
        const res = await api.get('/notifications', { params: { limit: 1 } });
        if (!cancelled && res.data.success) {
          setUnreadCount(res.data.unreadCount || 0);
        }
      } catch {
        // ignore — badge simply stays hidden
      }
    };
    fetchUnread();
    // Refresh immediately when notifications are marked as read elsewhere.
    window.addEventListener('notifications-updated', fetchUnread);
    return () => {
      cancelled = true;
      window.removeEventListener('notifications-updated', fetchUnread);
    };
  }, [isAuthenticated, location.pathname, user?._id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) =>
    `flex items-center space-x-2 text-sm font-medium transition-colors px-3 py-2 rounded-xl ${isActive(path)
      ? 'bg-forest-600 text-white'
      : 'text-forest-100 hover:bg-forest-800 hover:text-white'
    }`;

  return (
    <nav className="bg-forest-900 border-b border-forest-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo / Branding */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-forest-500 flex items-center justify-center group-hover:bg-forest-400 transition-colors">
              <Tractor className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block leading-tight text-white">
                AgriRent<span className="text-forest-300">Hub</span>
              </span>
              <span className="text-[11px] text-forest-300 font-medium tracking-wider uppercase block">
                Smart Equipment Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
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
                  className="bg-forest-600 hover:bg-forest-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors flex items-center space-x-1"
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
                  <Tractor className="w-4 h-4" />
                  <span>Equipment Management</span>
                </Link>
                <Link to="/admin/bookings" className={linkClass('/admin/bookings')}>
                  <CalendarCheck className="w-4 h-4" />
                  <span>Bookings</span>
                </Link>
                <Link to="/admin/maintenance" className={linkClass('/admin/maintenance')}>
                  <Wrench className="w-4 h-4" />
                  <span>Maintenance</span>
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

            {/* Shared links for authenticated users */}
            {isAuthenticated && (
              <>
                <Link to="/assistant" className={linkClass('/assistant')}>
                  <Bot className="w-4 h-4" />
                  <span>Assistant</span>
                </Link>
                <Link to="/notifications" className={`relative ${linkClass('/notifications').replace(
                  'text-sm font-medium transition-colors px-3 py-2 rounded-xl ',
                  ''
                )}`}>
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shadow">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* Auth Info & Logout Button */}
            {isAuthenticated && (
              <div className="flex items-center pl-4 border-l border-forest-800 space-x-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-white leading-none">
                    {user?.name}
                  </div>
                  <div className="text-[11px] text-forest-300 font-medium capitalize mt-1 flex items-center justify-end space-x-1">
                    {user?.role === 'admin' && <ShieldCheck className="w-3 h-3 text-amber-400 inline" />}
                    <span>{user?.role}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  aria-label="Logout"
                  className="bg-forest-950/60 hover:bg-rose-900 text-forest-200 hover:text-rose-200 p-2 rounded-xl transition-colors border border-forest-800"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-menu"
              className="text-forest-200 hover:text-white p-2 rounded-xl focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-300"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-menu" className="lg:hidden bg-forest-950 border-t border-forest-800 px-4 pt-3 pb-4 space-y-2">
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
                className="w-full text-center bg-forest-600 hover:bg-forest-700 text-white font-semibold px-4 py-2 rounded-xl text-sm block mt-2"
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
              <Link to="/admin/maintenance" onClick={() => setMobileMenuOpen(false)} className={linkClass('/admin/maintenance')}>
                Maintenance
              </Link>
              <Link to="/admin/customers" onClick={() => setMobileMenuOpen(false)} className={linkClass('/admin/customers')}>
                Customers
              </Link>
              <Link to="/assistant" onClick={() => setMobileMenuOpen(false)} className={linkClass('/assistant')}>
                Farmer Assistant
              </Link>
              <Link to="/notifications" onClick={() => setMobileMenuOpen(false)} className={linkClass('/notifications')}>
                Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left text-rose-300 hover:bg-forest-800 px-3 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 mt-2"
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
              <Link to="/assistant" onClick={() => setMobileMenuOpen(false)} className={linkClass('/assistant')}>
                Farmer Assistant
              </Link>
              <Link to="/notifications" onClick={() => setMobileMenuOpen(false)} className={linkClass('/notifications')}>
                Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left text-rose-300 hover:bg-forest-800 px-3 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 mt-2"
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
