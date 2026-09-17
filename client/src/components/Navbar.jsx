import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import api from '../api/axios';
import {
  Tractor,
  LogOut,
  LogIn,
  UserPlus,
  ShieldCheck,
  Bell,
  Menu,
  X
} from 'lucide-react';

/* ------------------------------------------------------------------
 * Navbar — the ONE global, slim top bar (all routes: public + protected).
 *
 * Information architecture rules enforced here:
 *  1. No dashboard/sidebar navigation links. The Sidebar owns ALL of the
 *     authenticated navigation; Navbar never duplicates it.
 *  2. Public(ish) only: Home / Login / Register links when unauthenticated.
 *  3. When authenticated: brand + notifications bell (unread badge) + user
 *     chip + logout + a mobile hamburger.
 *  4. The mobile hamburger no longer opens Navbar's own duplicated drawer —
 *     it toggles the role-aware Sidebar drawer via UIContext (global), so the
 *     trigger works even though the drawer markup lives inside DashboardLayout.
 * ------------------------------------------------------------------ */

// Routes that live inside the dashboard shell (Sidebar is meaningful there).
const SHELL_PATHS = [
  '/customer/dashboard',
  '/admin/dashboard',
  '/admin/equipment',
  '/admin/bookings',
  '/admin/customers',
  '/admin/maintenance',
  '/equipment',
  '/bookings',
  '/assistant',
  '/notifications'
];

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { toggleSidebar, requestSidebarFocus } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [publicMenuOpen, setPublicMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const drawerTriggerRef = useRef(null);

  const isShellPage = SHELL_PATHS.includes(location.pathname);

  // Track unread notification count for the bell badge.
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

  const publicLinkClass = ({ isActive }) =>
    `flex items-center space-x-2 text-sm font-medium transition-colors px-3 py-2 rounded-xl ${
      isActive ? 'bg-forest-600 text-white' : 'text-forest-100 hover:bg-forest-800 hover:text-white'
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
            <div className="leading-tight">
              <span className="font-bold text-lg tracking-tight block leading-tight text-white">
                AgriRent<span className="text-forest-300">Hub</span>
              </span>
              <span className="text-[11px] text-forest-300 font-medium tracking-wider uppercase block">
                Smart Equipment Platform
              </span>
            </div>
          </Link>

          {/* Desktop: public links OR auth cluster */}
          <div className="hidden lg:flex items-center space-x-2">
            {!isAuthenticated ? (
              <>
                <Link to="/" className={publicLinkClass({ isActive: location.pathname === '/' })}>
                  Home
                </Link>
                <Link to="/login" className={publicLinkClass({ isActive: location.pathname === '/login' })}>
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
            ) : (
              <>
                {/* Notifications Bell with unread badge */}
                <Link
                  to="/notifications"
                  className="relative p-3 rounded-xl transition-colors hover:bg-forest-800"
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shadow">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Auth Info & Logout Button */}
                <div className="flex items-center pl-4 border-l border-forest-800 space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white leading-none">{user?.name}</div>
                    <div className="text-[11px] text-forest-300 font-medium capitalize mt-1 flex items-center justify-end space-x-1">
                      {user?.role === 'admin' && <ShieldCheck className="w-3 h-3 text-amber-400" />}
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
              </>
            )}
          </div>

          {/* Mobile: hamburger. On shell pages it opens the Sidebar drawer;
              on public pages it toggles Navbar's own small public drawer. */}
          <div className="lg:hidden flex items-center">
            <button
              ref={!isAuthenticated ? undefined : addNavbarTrigger}
              onClick={() => {
                if (isAuthenticated && isShellPage) {
                  toggleSidebar();
                } else {
                  setPublicMenuOpen(!publicMenuOpen);
                }
              }}
              aria-label={
                isAuthenticated && isShellPage
                  ? publicMenuOpen || 'Open navigation menu'
                  : publicMenuOpen
                    ? 'Close menu'
                    : 'Open menu'
              }
              aria-expanded={isAuthenticated && isShellPage ? undefined : publicMenuOpen}
              aria-controls={isAuthenticated && isShellPage ? undefined : 'mobile-navigation-menu'}
              className="text-forest-200 hover:text-white p-2 rounded-xl focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-300"
            >
              {isAuthenticated && isShellPage ? (
                <Menu className="w-6 h-6" />
              ) : publicMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Public mobile drawer (unauthenticated or non-shell pages only) */}
      {publicMenuOpen && (
        <div id="mobile-navigation-menu" className="lg:hidden bg-forest-950 border-t border-forest-800 px-4 pt-3 pb-4 space-y-2">
          <Link to="/" onClick={() => setPublicMenuOpen(false)} className={publicLinkClass({ isActive: location.pathname === '/' })}>
            Home
          </Link>
          <Link to="/login" onClick={() => setPublicMenuOpen(false)} className={publicLinkClass({ isActive: location.pathname === '/login' })}>
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </Link>
          <Link
            to="/register"
            onClick={() => setPublicMenuOpen(false)}
            className="w-full text-center bg-forest-600 hover:bg-forest-700 text-white font-semibold px-4 py-2 rounded-xl text-sm block mt-2"
          >
            Register
          </Link>
        </div>
      )}
    </nav>
  );

  // Registers the navbar hamburger as the UI-sidebar focus restore target
  // for the drawer's a11y (focus returns here on close).
  function addNavbarTrigger(el) {
    drawerTriggerRef.current = el;
    if (isAuthenticated && isShellPage) {
      requestSidebarFocus(el);
    }
  }
};

export default Navbar;
