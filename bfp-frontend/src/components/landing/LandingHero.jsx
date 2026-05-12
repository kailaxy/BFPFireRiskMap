import React from 'react';
import mappreview from '../../assets/mappreview.png';
import { useNavigate } from 'react-router-dom';
import '../landing/landing.css';

export default function LandingHero() {
  const nav = useNavigate();
  return (
    <section className="landing-hero">
      <h1>Welcome to Fire Hazard Mapping System of Mandaluyong City</h1>
      <p>Explore the comprehensive Fire Hazard Mapping System specifically designed for Mandaluyong City.</p>
      <div style={{ marginTop: 20 }}>
        <button className="explore-btn" onClick={() => nav('/map')}>Explore the Map</button>
      </div>
      {/* small static map preview (clicking Explore opens full map) */}
      <div className="landing-preview">
        <div className="preview-box">
          <img src={mappreview} alt="map preview" />
        </div>
      </div>
    </section>
  );
}
