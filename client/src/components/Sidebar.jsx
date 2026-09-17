import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Tractor,
  Users,
  Wrench,
  Bot,
  Bell,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

/* ------------------------------------------------------------------
 * Sidebar
 * ------------------------------------------------------------------
 * Role-aware, sectioned vertical navigation for the authenticated
 * dashboard shell.
 *
 * Only REAL existing routes are used. There is no /payments, /rentals,
 * or /analytics route — the spec's "Payments / Rentals / Analytics"
 * categories are surfaced as real-data SECTIONS inside the dashboards,
 * never as invented links.
 *
 * Layout strategy (no duplicate nav anywhere):
 *  - Navbar = slim public top bar (brand + auth links/bell/user).
 *  - Sidebar = the ONLY imported nav; rendered inside DashboardLayout
 *    as a persistent desktop column (lg+) and a mobile drawer (<lg)
 *    whose state lives in UIContext so the global Navbar trigger works
 *    across route boundaries.
 * ------------------------------------------------------------------ */

const linkBase =
  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2';

const sectionLabel =
  'px-3 pt-6 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400';

const renderNav = (navItems, role, onNavigate, isMobile) => (
  <nav
    className={`${
      isMobile ? 'space-y-0.5 px-3' : 'flex-1 overflow-y-auto px-3 pb-4 space-y-0.5'
    }`}
    aria-label={`${role === 'admin' ? 'Admin' : 'Customer'} primary navigation`}
  >
    {navItems.map((item, idx) =>
      item.section ? (
        <p key={`sec-${idx}`} className={sectionLabel}>
          {item.label}
        </p>
      ) : (
        <NavLink
          key={`link-${item.to}`}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? 'bg-forest-600 text-white shadow-sm shadow-forest-600/30'
                : 'text-stone-600 hover:bg-forest-50 hover:text-forest-800'
            }`
          }
          aria-current={(ctx) => (ctx.isActive ? 'page' : undefined)}
        >
          <item.icon className="w-5 h-5 shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      )
    )}
  </nav>
);

const Sidebar = ({ onNavigate }) => {
  const { user } = useAuth();
  // Drawer state (mobile) is owned by UIContext so the global Navbar trigger
  // can open/close it without prop drilling through every protected page.
  const { sidebarOpen, closeSidebar } = useUI();
  const role = user?.role === 'admin' ? 'admin' : 'customer';

  const adminNav = [
    { section: true, label: 'Workspace' },
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { section: true, label: 'Operations' },
    { to: '/admin/equipment', icon: Tractor, label: 'Equipment Management' },
    { to: '/admin/bookings', icon: CalendarCheck, label: 'Bookings' },
    { to: '/admin/customers', icon: Users, label: 'Customers' },
    { section: true, label: 'Maintenance' },
    { to: '/admin/maintenance', icon: Wrench, label: 'Maintenance Center' },
    { section: true, label: 'Intelligence' },
    { to: '/assistant', icon: Bot, label: 'Farmer Assistant' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  const customerNav = [
    { section: true, label: 'Workspace' },
    { to: '/customer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { section: true, label: 'Discover' },
    { to: '/equipment', icon: Tractor, label: 'Equipment' },
    { section: true, label: 'Rentals' },
    { to: '/bookings', icon: CalendarCheck, label: 'My Bookings' },
    { section: true, label: 'Intelligence' },
    { to: '/assistant', icon: Bot, label: 'Farmer Assistant' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  const navItems = role === 'admin' ? adminNav : customerNav;

  const handleNavigate = () => {
    onNavigate?.();
    // Mobile drawer: close after navigating to a destination.
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  // Desktop persistent column (lg+): pure companion to the top bar, no drawer.
  return (
    <>
      {/* ---- Desktop sidebar (always visible on lg+) ---- */}
      <div className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-stone-200">
        <div className="px-3 py-4 border-b border-stone-100 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-forest-600 flex items-center justify-center">
            <Tractor className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold text-stone-900">
              AgriRent<span className="text-forest-600">Hub</span>
            </p>
            <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
              {user?.name}
            </p>
          </div>
        </div>
        {renderNav(navItems, role, handleNavigate, false)}
      </div>

      {/* ---- Mobile / tablet drawer (<lg) ---- */}
      <div
        data-sidebar-drawer
        className={`fixed inset-0 z-[90] lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!sidebarOpen}
      >
        {/* Backdrop */}
        <div
          tabIndex={-1}
          onClick={closeSidebar}
          className={`absolute inset-0 bg-stone-900/50 backdrop-blur-[2px] transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
          data-sidebar-backdrop
        />
        {/* Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${role === 'admin' ? 'Admin' : 'Customer'} navigation menu`}
          data-sidebar-panel
          className={`absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-forest-600 flex items-center justify-center">
                <Tractor className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-extrabold text-stone-900">
                  AgriRent<span className="text-forest-600">Hub</span>
                </p>
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                  Menu
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeSidebar}
              aria-label="Close navigation menu"
              className="p-2 rounded-xl text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {renderNav(navItems, role, handleNavigate, true)}
          <div className="p-3 border-t border-stone-100" data-sidebar-drawer-footer />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
