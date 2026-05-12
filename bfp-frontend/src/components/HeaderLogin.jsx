import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './landing/landing.css';
import logoImg from './landing/images/v2_120.png';
import { UserContext } from '../logic.jsx';
import { API_BASE_URL } from '../config';
import './Header.css';

export default function HeaderLogin() {
  const { user, logout, setUser } = useContext(UserContext);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef();
  const menuRef = useRef();
  const navigate = useNavigate();

  const [isNarrow, setIsNarrow] = useState(false);
  const forceMobile = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mobile') === '1';

  // If the logged-in user lacks station_name but has station_id, attempt to enrich the user
  // by fetching the public stations list and updating context/localStorage.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!user || user.station_name) return;
        const stationId = user.station_id;
        if (!stationId) return;
        const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/firestation`);
        if (!res.ok) return;
        const data = await res.json();
        const features = Array.isArray(data.features) ? data.features : [];
        const match = features.find(f => f && f.properties && Number(f.properties.id) === Number(stationId));
        if (match && match.properties && match.properties.name) {
          const updated = Object.assign({}, user, { station_name: match.properties.name });
          try { localStorage.setItem('user', JSON.stringify(updated)); } catch (e) {}
          if (mounted && typeof setUser === 'function') setUser(updated);
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [user, setUser]);

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

  return (
    <header className="landing-header" style={{ position: 'relative' }}>
      {/* Hamburger for mobile - only render when narrow or forceMobile */}
      {(isNarrow || forceMobile) && (
        <button className="hamburger" data-force={forceMobile} aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)} style={{ position: 'absolute', right: 12, top: 10, zIndex: 1600 }}>
          <span className={`hamburger-box ${mobileOpen ? 'open' : ''}`}>
            <span className="hamburger-inner" />
          </span>
        </button>
      )}

      <Link to="/landing" className="brand" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
        <img className="brand-logo" src={logoImg} alt="BFP logo" />
        <div className="brand-text">
          <div style={{ fontWeight: 700, color: 'inherit' }}>FIRE RISK ASSESSMENT MAP</div>
          <div style={{ fontSize: 12, color: 'inherit' }}>Comprehensive Map of Mandaluyong City</div>
        </div>
      </Link>

      <nav className="landing-nav">
        <Link to={user?.role === 'admin' ? '/admin' : '/'}>{user?.role === 'admin' ? 'Admin Dashboard' : 'Home'}</Link>
        <Link to="/map">Map Dashboard</Link>
        {/* Reports link removed per request */}
        {!user ? (
          <Link to="/login">Login</Link>
        ) : (
          <div ref={ref} style={{ position: 'relative' }}>
            <button className="user-btn" onClick={() => setOpen(v => !v)} aria-haspopup="true" aria-expanded={open} title="User menu">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="12" cy="8" r="3" fill="#0b1220" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#0b1220" />
              </svg>
            </button>
            {open && (
              <div className="user-dropdown" style={{ right: 0, position: 'absolute', top: 'calc(100% + 8px)' }}>
                <div className="dropdown-head" style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700 }}>{user?.username || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{(user?.role || '').toUpperCase()}</div>
                  {user && (user.station_name || user.station || user.station_id) && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                      {user.station_name || (user.station && (user.station.name || String(user.station))) || (user.station_id ? `Station #${user.station_id}` : null)}
                    </div>
                  )}
                </div>
                <div className="item" onClick={() => { setOpen(false); logout(); navigate('/'); }}>Logout</div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Mobile menu overlay/panel - placed outside .landing-nav so landing.css doesn't hide it on mobile */}
      <div
        className={`mobile-menu ${mobileOpen ? 'open' : ''}`}
        ref={menuRef}
        onClick={(e) => { if (e.target === e.currentTarget) setMobileOpen(false); }}
        aria-hidden={!mobileOpen}
      >
        <div className="mobile-menu-inner" role="dialog" aria-label="Mobile menu">
          <button className="mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}>✕</button>
          <Link to={user?.role === 'admin' ? '/admin' : '/'} onClick={() => setMobileOpen(false)}>{user?.role === 'admin' ? 'Admin Dashboard' : 'Home'}</Link>
          <Link to="/map" onClick={() => setMobileOpen(false)}>Map</Link>
          {/* Reports link removed per request */}
          {user ? (
            <button className="mobile-logout" onClick={() => { setMobileOpen(false); logout(); navigate('/'); }}>Logout</button>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
          )}
          {user && (
            <div className="mobile-user-info" aria-hidden={false}>
              <div className="mu-name">{user?.username || user?.name || 'Unknown'}</div>
              <div className="mu-role" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{(user?.role || '').toUpperCase()}</div>
              {(user && (user.station_name || user.station || user.station_id)) && (
                <div className="mu-station" style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                  {user.station_name || (user.station && (user.station.name || String(user.station))) || (user.station_id ? `Station #${user.station_id}` : null)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
