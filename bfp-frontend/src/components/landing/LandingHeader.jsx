import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../landing/landing.css';
import logoImg from './images/v2_120.png';

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="landing-header">
      <div className="brand">
        <img className="brand-logo" src={logoImg} alt="BFP logo" />
        <div className="brand-text">
          <div style={{ fontWeight: 700 }}>FIRE RISK ASSESSMENT MAP</div>
          <div style={{ fontSize: 12 }}>Comprehensive Map of Mandaluyong City</div>
        </div>
      </div>

      <button className="hamburger" aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)}>
        <span className={`hamburger-box ${mobileOpen ? 'open' : ''}`}>
          <span className="hamburger-inner" />
        </span>
      </button>

      <nav className="landing-nav">
        <Link to="/">Home</Link>
        <Link to="/map">Map Dashboard</Link>
        <Link to="/login">Login</Link>
      </nav>

      {/* Mobile overlay menu */}
      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setMobileOpen(false); }}>
        <div className="mobile-menu-inner" role="dialog" aria-label="Mobile menu">
          <button className="mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}>✕</button>
          <Link to="/" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/map" onClick={() => setMobileOpen(false)}>Map</Link>
          <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
        </div>
      </div>
    </header>
  );
}
