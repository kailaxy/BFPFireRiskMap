import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './AdminLayout.css';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('adminSidebarCollapsed');
    if (stored) setCollapsed(stored === '1');
  }, []);

  function toggle() {
    setCollapsed((s) => {
      const next = !s;
      localStorage.setItem('adminSidebarCollapsed', next ? '1' : '0');
      return next;
    });
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (window.innerWidth <= 880 && mobileMenuOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Close mobile menu when nav link is clicked
  const handleNavClick = () => {
    if (window.innerWidth <= 880) {
      setMobileMenuOpen(false);
    }
  };

  return (
  <div className={`admin-layout ${collapsed ? 'collapsed' : ''}`}>
    {/* Mobile hamburger toggle button */}
    <button 
      className="mobile-sidebar-toggle" 
      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      aria-label="Toggle sidebar"
    >
      {mobileMenuOpen ? '✕' : '☰'}
    </button>

    {/* Mobile overlay backdrop */}
    {mobileMenuOpen && <div className="mobile-sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />}

    <aside ref={sidebarRef} className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} aria-hidden={collapsed}>
          <div className="admin-top">
            <div className="admin-brand">⚙️ Admin</div>
            <button
              className="sidebar-toggle"
              onClick={toggle}
              aria-label="Toggle sidebar"
              aria-pressed={collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? '➡' : '⬅'}
            </button>
            {/* mobile close removed — sidebar is fixed */}
          </div>
        <nav className="admin-nav" role="navigation" aria-label="Admin navigation" onClick={handleNavClick}>
          <NavLink to="/admin" end className={({isActive}) => isActive ? 'active nav-item' : 'nav-item'} title="Overview">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
                <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="nav-label">Overview</span>
          </NavLink>
          <NavLink to="/admin/hydrants" className={({isActive}) => isActive ? 'active nav-item' : 'nav-item'} title="Hydrants">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
                <path d="M12 3s5 5.5 5 9a5 5 0 1 1-10 0c0-3.5 5-9 5-9z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill="currentColor" />
              </svg>
            </span>
            <span className="nav-label">Hydrants</span>
          </NavLink>
          <NavLink to="/admin/fire-stations" className={({isActive}) => isActive ? 'active nav-item' : 'nav-item'} title="Fire Stations">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
                <path d="M3 21h18M5 21V9l7-5 7 5v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 13h6v8H9z" fill="currentColor" opacity="0.3" />
                <circle cx="9" cy="13" r="1" fill="currentColor" />
                <circle cx="15" cy="13" r="1" fill="currentColor" />
              </svg>
            </span>
            <span className="nav-label">Fire Stations</span>
          </NavLink>
          <NavLink to="/admin/barangays" className={({isActive}) => isActive ? 'active nav-item' : 'nav-item'} title="Barangays">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
                <path d="M12 21s7-4.5 7-10a7 7 0 1 0-14 0c0 5.5 7 10 7 10z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="11" r="2" fill="currentColor" />
              </svg>
            </span>
            <span className="nav-label">Barangays</span>
          </NavLink>
          <NavLink to="/admin/users" className={({isActive}) => isActive ? 'active nav-item' : 'nav-item'} title="Users">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
                <path d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11zM8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 20c0-2.5 3.5-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="nav-label">Users</span>
          </NavLink>
          <NavLink to="/admin/active-fires" className={({isActive}) => isActive ? 'active nav-item' : 'nav-item'} title="Active Fires">
            <span className="nav-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
              </svg>
            </span>
            <span className="nav-label">Active Fires</span>
          </NavLink>
            <NavLink to="/admin/historical-fires" className={({isActive}) => isActive ? 'active nav-item' : 'nav-item'} title="Historical Fires">
              <span className="nav-icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C12 2 9 5 9 8a3 3 0 0 0 6 0c0-3-3-6-3-6z"/><path d="M5 22c2-2 5-3 7-3s5 1 7 3"/></svg>
              </span>
              <span className="nav-label">Historical Fires</span>
            </NavLink>
          <NavLink to="/admin/forecasts" className={({isActive}) => isActive ? 'active nav-item' : 'nav-item'} title="Forecasts">
            <span className="nav-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </span>
            <span className="nav-label">Forecasts</span>
          </NavLink>
        </nav>
    </aside>

    <main className="admin-content" role="main">
        <div className="admin-content-inner">
          <div className="admin-toolbar" role="toolbar">
            <div className="toolbar-left">
            </div>
            <div className="toolbar-right" />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
