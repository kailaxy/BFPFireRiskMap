import React, { useContext, useState } from "react";
import { MapContext } from "../logic.jsx";

export default function RouteSidebar({ onStart, onClose, destination, onBack }) {
  const { userLocation } = useContext(MapContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <header className="sidebar-header">
        <h3>Route to Destination</h3>
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
          <button type="button" className="btn-close" aria-label="Close sidebar" onClick={onClose}>×</button>
        </div>
      </header>
      
      {!sidebarCollapsed && (
        <div style={{ padding: "1rem 1.5rem" }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn back" onClick={onBack} style={{ marginTop: 8 }} aria-label="Back">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>
            
          <p>
            <strong>Destination:</strong>{" "}
            {destination
              ? `${destination.lat.toFixed(6)}, ${destination.lng.toFixed(6)}`
              : "Unknown"}
          </p>
      
          {!userLocation && (
            <div style={{ 
              padding: "12px", 
              backgroundColor: "#fff3cd", 
              border: "1px solid #ffeaa7", 
              borderRadius: "4px", 
              marginBottom: "16px",
              color: "#856404"
            }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>📍 Location Required</p>
              <p style={{ margin: "0", fontSize: "14px" }}>
                Please set your location first by clicking the location button in the bottom right corner.
              </p>
            </div>
          )}
      
          <button 
            className="btn primary" 
            onClick={onStart}
            disabled={!userLocation}
            style={{ 
              opacity: !userLocation ? 0.6 : 1,
              cursor: !userLocation ? "not-allowed" : "pointer"
            }}
          >
            Start Tracking
          </button>
        </div>
      )}
    </aside>
  );
}