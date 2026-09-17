/* eslint-disable react-refresh/only-export-components -- UIContext intentionally
   co-exports its Provider component + useUI hook (identical to AuthContext's
   established provider+hook pattern in this codebase). */
import { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';

/* ------------------------------------------------------------------
 * UIContext — lightweight UI shell state shared between the global top
 * header (Navbar) and the page-scoped sidebar drawer across route
 * boundaries. No prop drilling, no new libraries.
 *
 * Owns:
 *   sidebarOpen        → drawer visibility (desktop persist + mobile drawer)
 *   open/close/toggle  → drawer state transitions
 *   requestSidebarFocus(el) → remember the element that requested focus so
 *                             the drawer can restore focus on close (a11y)
 * ------------------------------------------------------------------ */
const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarTriggerRef = useRef(null);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  const requestSidebarFocus = useCallback((el) => {
    sidebarTriggerRef.current = el;
  }, []);

  useEffect(() => {
    return () => {
      sidebarTriggerRef.current = null;
    };
  }, []);

  return (
    <UIContext.Provider value={{ sidebarOpen, openSidebar, closeSidebar, toggleSidebar, requestSidebarFocus }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return ctx;
};
