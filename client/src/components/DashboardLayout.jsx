import Sidebar from './Sidebar';

/* ------------------------------------------------------------------
 * DashboardLayout — authenticated shell that sits INSIDE the global
 * top header (Navbar).
 *
 * Responsibilities (kept intentionally thin so it never duplicates
 * chrome the global Navbar already owns):
 *  - Host the ONLY navigation element: <Sidebar/> (persistent desktop
 *    column on lg+, responsive drawer below lg driven by UIContext).
 *  - Render the routed page content via {children}.
 *
 * The global Navbar remains the single top bar (brand + public links
 * when unauthenticated; notifications bell + user chip + logout + the
 * mobile drawer trigger when authenticated). The Navbar does NOT render
 * any sidebar links — navigation responsibility lives here and only here.
 * ------------------------------------------------------------------ */
const DashboardLayout = ({ children }) => {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)]">
      {/* Persistent sidebar (lg+) + responsive drawer (<lg) — the ONLY nav */}
      <Sidebar />

      {/* Page content — routes preserved, rendered inside the shell.
          Children are used (NOT <Outlet/>) because App.jsx supplies each
          protected page as a children prop on flat routes here. */}
      <main className="flex-1 min-w-0 page-shell">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
