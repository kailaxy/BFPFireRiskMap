import React, { useContext, useState } from "react";
import { MapContext } from "../logic.jsx";
import smoothPanAndZoom from "../utils/mapHelpers";
import './ActiveFireSidebar.css';
import { findNearby } from "./sidebar/sidebarUtils";

const ALARM_LEVELS = [
  "first", "second", "third", "fourth", "fifth",
  "alpha", "bravo", "charlie", "delta", "general"
];

export default function ActiveFireSidebar({ fire, onClose }) {
  const {
    userLocation,
    updateAlarmLevel,
    hydrants,
    fireStations,
    setSelectedHydrant,
    setSelectedStation,
    setShowSidebar,
    setShowHydrants,
    setShowFireStations,
    setShowBoundaries,
    setShowFireRisk,
    setShowLayersPanel,
    setSelectedBarangay,
    setNearbyHydrants,
    setNearbyStations,
    setShowOnlyNearby,
    nearbyHydrants,
    nearbyStations,
    sidebarCollapsed,
    setSidebarCollapsed,
    mapRef,
    setRouteTo,
  } = useContext(MapContext);

  const [alarmDropdown, setAlarmDropdown] = useState(false);
  const [pendingLevel, setPendingLevel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [view, setView] = useState('info'); // 'info' | 'nearby'
  const [expandedId, setExpandedId] = useState(null);

  // Close handler that restores default hydrant/station view when closing the nearby list
  const handleClose = () => {
    if (view === 'nearby') {
      try { setShowOnlyNearby(false); } catch (err) {}
      try { setNearbyHydrants([]); } catch (err) {}
      try { setNearbyStations([]); } catch (err) {}
      try { setShowHydrants(true); } catch (err) {}
      try { setShowFireStations(true); } catch (err) {}
      try { setShowFireRisk(false); } catch (err) {}
    }
    try { onClose && onClose(); } catch (err) {}
  };

  // Helper: show only street and barangay; strip city name like 'Mandaluyong' if present
  const shortAddress = (full, barangay) => {
    if (!full) return barangay || '';
    // Remove trailing city mentions (case-insensitive)
    let s = full.replace(/,?\s*mandaluyong(?:\s+city)?\.?$/i, '');
    // Optionally shorten long addresses to just street portion before the first comma
    const parts = s.split(',').map(p => p.trim()).filter(Boolean);
    return parts.length ? parts[0] + (barangay ? `, ${barangay}` : '') : (barangay || s);
  };

  if (!fire) return null;

  const handleStartTracking = () => {
    setRouteTo({
      from: userLocation,
      to: {
        lat: fire.geometry.coordinates[1],
        lng: fire.geometry.coordinates[0],
      },
    });
    onClose();
  };

  const handleAlarmChange = (newLevel) => {
    setPendingLevel(newLevel);
    setConfirmOpen(true);
  };

  const confirmAlarmChange = async () => {
    setLoading(true);
    await updateAlarmLevel(fire.properties.id, pendingLevel);
    setLoading(false);
    setAlarmDropdown(false);
    setPendingLevel(null);
    setConfirmOpen(false);
  };

  const cancelAlarmChange = () => {
    setPendingLevel(null);
    setConfirmOpen(false);
  };

  // Show nearby hydrants and stations logic
  const handleShowNearby = () => {
    const routeTo = {
      to: {
        lat: fire.geometry.coordinates[1],
        lng: fire.geometry.coordinates[0],
      },
    };
    const { hydrants: filteredHydrants, stations: filteredStations } = findNearby(routeTo, hydrants, fireStations);
    setNearbyHydrants(filteredHydrants);
    setNearbyStations(filteredStations);
    setShowOnlyNearby(true);

    setShowHydrants(true);
    setShowFireStations(true);
    setShowBoundaries(false);
    setShowFireRisk(false);
    setShowLayersPanel(false);
    setSelectedBarangay(null);

    if (filteredHydrants.length) {
      setSelectedHydrant(filteredHydrants[0]);
      setShowSidebar(false); // Only select, don't open sidebar
    } else if (filteredStations.length) {
      setSelectedStation(filteredStations[0]);
      setShowSidebar(false); // Only select, don't open sidebar
    } else {
      alert("No nearby hydrants or fire stations found within 500m.");
    }
  };

  return (
    <>
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <header className="sidebar-header">
          <h3>{view === 'info' ? 'Active Fire Info' : 'Nearby Hydrants & Fire Stations'}</h3>
          <div className="sidebar-header-buttons">
            <button 
              type="button" 
              className="btn-collapse" 
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? '▶' : '◀'}
            </button>
            <button type="button" className="btn-close" aria-label="Close sidebar" onClick={handleClose}>×</button>
          </div>
        </header>
        {!sidebarCollapsed && (
          <div style={{ padding: "1rem 1.5rem" }}>
          {view === 'info' && (
            <>
              <p><strong>Address:</strong> {fire.properties.address}</p>
              <p><strong>Barangay:</strong> {fire.properties.barangay}</p>
              <p><strong>Alarm Level:</strong>
                <button
                  className="afm-alarm-btn"
                  style={{ marginLeft: 8 }}
                  onClick={() => setAlarmDropdown((v) => !v)}
                  disabled={loading}
                >
                  {fire.properties.alarm_level}
                </button>
                {alarmDropdown && (
                  <div className="afm-alarm-dropdown" style={{ position: "relative", zIndex: 10 }}>
                    {ALARM_LEVELS.map(level => (
                      <div
                        key={level}
                        className={`afm-alarm-option${fire.properties.alarm_level === level ? " selected" : ""}`}
                        onClick={() => handleAlarmChange(level)}
                        style={{ cursor: loading ? "not-allowed" : "pointer" }}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)} Alarm
                      </div>
                    ))}
                  </div>
                )}
              </p>
            </>
          )}
          {view === 'info' ? (
            <>
              <button
                className="btn primary"
                onClick={handleStartTracking}
                style={{ marginTop: 16 }}
              >
                Get Directions
              </button>
              <button
                className="btn primary"
                style={{ marginTop: 12 }}
                onClick={() => { handleShowNearby(); setView('nearby'); }}
              >
                Show Nearby Hydrants & Fire Stations
              </button>
            </>
            ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn back" onClick={() => {
                // Reset hydrant display to show all hydrants like the close button does
                try { setShowOnlyNearby(false); } catch (err) {}
                try { setNearbyHydrants([]); } catch (err) {}
                try { setNearbyStations([]); } catch (err) {}
                try { setShowHydrants(true); } catch (err) {}
                try { setShowFireStations(true); } catch (err) {}
                try { setShowFireRisk(false); } catch (err) {}
                setView('info');
              }} style={{ marginTop: 8 }} aria-label="Back">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            </div>
          )}

          {view === 'nearby' && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ fontSize: 15 }}>Hydrants</h4>
              {(!nearbyHydrants || nearbyHydrants.length === 0) && <p>No hydrants found.</p>}
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {((nearbyHydrants || []).slice().sort((a, b) => {
                  // operational first
                  const pa = a.properties.is_operational ? 0 : 1;
                  const pb = b.properties.is_operational ? 0 : 1;
                  return pa - pb;
                })).map((h, idx) => {
                  const id = `nh-${idx}`;
                  const [lng, lat] = h.geometry.coordinates;
                  return (
                    <li key={id} className="afs-list-item">
                      <div className="afs-item-row" onClick={() => {
                        // Toggle expansion, pan to the item, and select it so the radius appears
                        setExpandedId(expandedId === id ? null : id);
                        try { mapRef.current.panTo({ lat, lng }); smoothPanAndZoom(mapRef.current, 16); } catch (err) {}
                        try { setSelectedHydrant(h); } catch (err) {}
                      }}>
                        <div className="afs-item-title">{shortAddress(h.properties.address, h.properties.barangay)}</div>
                        <div className="afs-item-sub hydrant-status" aria-hidden={false} aria-label={h.properties.is_operational ? 'Operational' : 'Non-operational'}>
                          {h.properties.is_operational ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <circle cx="12" cy="12" r="8" fill="#16a34a" />
                              <path d="M9.5 12.8l1.8 1.8L15 11" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <circle cx="12" cy="12" r="8" fill="#ef4444" />
                              <path d="M9 9l6 6M15 9l-6 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className={`afs-expand ${expandedId === id ? 'open' : ''}`}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {/* Pan happens when clicking the item header */}
                          <button className="btn primary" onClick={() => {
                            if (!userLocation) { alert('Please set your location first.'); return; }
                            setRouteTo({ from: userLocation, to: { lat, lng } });
                            setSelectedHydrant(h);
                            handleClose();
                          }}>
                            Get Directions
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <h4 style={{ marginTop: 10, fontSize: 15 }}>Fire Stations</h4>
              {(!nearbyStations || nearbyStations.length === 0) && <p>No stations found.</p>}
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {(nearbyStations || []).map((s, idx) => {
                  const id = `ns-${idx}`;
                  const [lng, lat] = s.geometry.coordinates;
                  return (
                    <li key={id} className="afs-list-item">
                      <div className="afs-item-row" onClick={() => {
                        setExpandedId(expandedId === id ? null : id);
                        try { mapRef.current.panTo({ lat, lng }); smoothPanAndZoom(mapRef.current, 15); } catch (err) {}
                      }}>
                        <div className="afs-item-title">{s.properties.name || s.properties.id || 'Station'}</div>
                        <div className="afs-item-sub">{s.properties.operator || ''}</div>
                      </div>
                      <div className={`afs-expand ${expandedId === id ? 'open' : ''}`}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {/* Pan happens when clicking the item header */}
                          <button className="btn primary" onClick={() => {
                            if (!userLocation) { alert('Please set your location first.'); return; }
                            setRouteTo({ from: userLocation, to: { lat, lng } });
                            setSelectedStation(s);
                            onClose();
                          }}>
                            Get Directions
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        )}
      </aside>
      {confirmOpen && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm alarm level change"
            style={{
              background: "#ffffff", /* explicit white background for contrast */
              padding: 24,
              borderRadius: 8,
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              minWidth: 320,
              textAlign: "center",
              color: "#0b1220", /* explicit dark text color */
            }}
          >
            <h3 style={{ marginTop: 0, color: '#0b1220' }}>Confirm Alarm Level Change</h3>
            <p style={{ color: '#0b1220' }}>
              Are you sure you want to change the alarm level to <b style={{ color: '#0b1220' }}>{pendingLevel}</b>?
            </p>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 16 }}>
              <button onClick={confirmAlarmChange} style={{ padding: "8px 16px", background: "var(--accent-yellow)", color: "#111827", border: "none", borderRadius: 4 }}>Confirm</button>
              <button onClick={cancelAlarmChange} style={{ padding: "8px 16px", background: "#f3f4f6", color: "#0f172a", border: "none", borderRadius: 4 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}