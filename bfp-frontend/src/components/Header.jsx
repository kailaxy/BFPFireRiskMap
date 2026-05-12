import React, { useContext, useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../logic.jsx";
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useContext(UserContext);
  
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef();
  const menuRef = useRef();
  const [isNarrow, setIsNarrow] = useState(false);
  // detect force-mobile via URL param `?mobile=1`
  const forceMobile = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mobile') === '1';

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth <= 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Accessibility: trap focus inside mobile menu when open and close on Escape
  useEffect(() => {
    if (!mobileOpen) return undefined;

    const node = menuRef.current;
    if (!node) return undefined;

    // find focusable elements inside menu
    const focusable = node.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        if (focusable.length === 0) return;
        // forward tab
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          (first).focus();
        }
        // reverse tab
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          (last).focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    // set initial focus
    setTimeout(() => { try { first && first.focus(); } catch { /* ignore */ } }, 0);

    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <header className="header">
      <button className="hamburger" data-force={forceMobile} aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)} style={{ display: (isNarrow || forceMobile) ? undefined : undefined }}>
        <span className={`hamburger-box ${mobileOpen ? 'open' : ''}`}>
          <span className="hamburger-inner" />
        </span>
      </button>

      <span style={{ fontWeight: 700 }} className="header-title">BFP Fire Safety Mapping System</span>

      <nav
        className={`mobile-menu ${mobileOpen ? 'open' : ''}`}
        ref={menuRef}
        onClick={(e) => {
          // only close when clicking on the overlay (not the inner panel)
          if (e.target === e.currentTarget) setMobileOpen(false);
        }}
        aria-hidden={!mobileOpen}
      >
        <div className="mobile-menu-inner" role="dialog" aria-label="Mobile menu">
          <button className="mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}>✕</button>
          <Link to="/" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/map" onClick={() => setMobileOpen(false)}>Map</Link>
          {/* Reports removed per request */}
          {user ? (
            <button className="mobile-logout" onClick={() => { setMobileOpen(false); logout(); navigate('/'); }}>Logout</button>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
          )}
          {/* Show brief user/station info when available */}
          {user && (
            <div className="mobile-user-info" aria-hidden={false}>
              <div className="mu-name">{user.name || user.username}</div>
              {user.station && <div className="mu-station">Station: {user.station.name || user.station}</div>}
            </div>
          )}
        </div>
      </nav>
      {/* If user exists and is admin or responder, show user icon + dropdown */}
      {user && (user.role === 'admin' || user.role === 'responder') ? (
        <div className="user-control" ref={ref}>
          <button className="user-btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(v => !v)} title="User menu">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="8" r="3" fill="#0b1220" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#0b1220" />
            </svg>
          </button>
          {open && (
            <div className="user-dropdown" role="menu">
              <div className="item" onClick={() => { setOpen(false); logout(); navigate('/'); }}>Logout</div>
            </div>
          )}
        </div>
      ) : (
        // For non-admin/responder or not logged in, show standard Login/Logout buttons
        user ? (
          <button
            style={{ marginLeft: 16, padding: "6px 16px", borderRadius: 4, border: "1px solid var(--control-border)", background: "var(--brand-dark)", color: "var(--app-text)", cursor: "pointer" }}
            onClick={() => { logout(); navigate('/'); }}
          >
            Logout
          </button>
        ) : (
          <button
            style={{ marginLeft: 16, padding: "6px 16px", borderRadius: 4, border: "1px solid var(--control-border)", background: "var(--input-bg)", color: "var(--input-text)", cursor: "pointer" }}
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        )
      )}
    </header>
  );
}