import React, { useContext, useState } from 'react';
import ReactDOM from 'react-dom';
import { MapContext } from '../logic.jsx';
import { UserContext } from '../logic.jsx';
import { API_BASE_URL } from '../config';
import smoothPanAndZoom from '../utils/mapHelpers';
import ActiveFireResolveModal from './ActiveFireResolveModal';
import ActiveFireSidebar from './ActiveFireSidebar';
import './ActiveFiresMenu.css';

export default function ActiveFiresMenu() {
  const {
    fires,
    activeFiresMenuOpen,
    setActiveFiresMenuOpen,
    selectedActiveFireId,
    setSelectedActiveFireId,
    mapRef,
    sidebarOpen,
    setSidebarOpen,
    resolveFire,
  } = useContext(MapContext);
  
  const { user } = useContext(UserContext);

  const [modalOpen, setModalOpen] = useState(false);

  function getToken() { 
    return localStorage.getItem('token') || null; 
  }

  // using smoothPanAndZoom from utils

  const selectedFire = fires.find(f => f.properties.id === selectedActiveFireId);

  const handleSelect = (id) => {
    setSelectedActiveFireId(id);
    setActiveFiresMenuOpen(true);
    setModalOpen(false);
    const f = fires.find(x => x.properties.id === id);
    if (f && mapRef && mapRef.current) {
      const [lng, lat] = f.geometry.coordinates;
      try {
        // pan first, then smooth-zoom to target
        mapRef.current.panTo({ lat, lng });
        smoothPanAndZoom(mapRef.current, 15);
      } catch (err) {}
    }
  };

  const onResolveClick = () => {
    if (!selectedFire) return;
    
    if (!window.confirm('Are you sure you want to resolve this fire?')) {
      return;
    }
    
    setModalOpen(true);
  };

  const onFalseAlarmClick = async () => {
    if (!selectedFire) return;
    
    if (!window.confirm('Are you sure you want to mark this as a false alarm?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/active_fires/${selectedFire.properties.id}/false-alarm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          verified_by: user ? user.name : 'Admin',
          actions_taken: 'Marked as false alarm'
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark as false alarm');
      }

      alert('Fire report marked as false alarm successfully');
      
      // Update map if resolveFire exists
      if (resolveFire) {
        resolveFire(selectedFire.properties.id);
      }
      
      // Close the menu
      setActiveFiresMenuOpen(false);
      setSelectedActiveFireId(null);
    } catch (err) {
      console.error('Error marking as false alarm:', err);
      alert('Failed to mark as false alarm: ' + err.message);
    }
  };

  return (
    <>
      <div className={`active-fires-menu ${activeFiresMenuOpen ? 'open' : ''}`}>
        <button className="afm-header" onClick={() => setActiveFiresMenuOpen(o => !o)}>
          <span className="afm-header-desktop-text">
            {activeFiresMenuOpen ? 'Hide Active Fires' : `Active Fires (${fires.length})`}
          </span>
          <span className="afm-header-mobile-number">
            {fires.length}
          </span>
        </button>
        {activeFiresMenuOpen && (
          <div className="afm-list">
            {fires.map(f => (
              <div
                key={f.properties.id}
                className={`afm-item ${selectedActiveFireId === f.properties.id ? 'selected' : ''}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => handleSelect(f.properties.id)}
              >
                <span>{f.properties.address}</span>
                <div className="afm-actions">
                  <button
                    className="afm-info-btn"
                    title="Show Info"
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedActiveFireId(f.properties.id);
                      setSidebarOpen(true);
                      if (mapRef && mapRef.current) {
                        const [lng, lat] = f.geometry.coordinates;
                        try { mapRef.current.panTo({ lat, lng }); smoothPanAndZoom(mapRef.current, 15); } catch (err) {}
                      }
                      setActiveFiresMenuOpen(false); // ← Hide/close the menu when opening sidebar
                    }}
                  >
                    <svg className="afm-info-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="false" aria-label="Show info" style={{display: 'block'}}>
                      <title>Show info</title>
                      <circle cx="12" cy="12" r="11" fill="#0b1220" />
                      <path d="M12 8v.01" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M11 11h2v5h-2z" fill="#ffffff" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {selectedFire && user && (user.role === 'responder' || user.role === 'admin') && (
              <div className="afm-form-trigger">
                <button onClick={onResolveClick} style={{backgroundColor: '#dc3545', color: 'white', marginRight: '8px'}}>
                  Resolve Selected Fire
                </button>
                <button onClick={onFalseAlarmClick} style={{backgroundColor: '#ffc107', color: '#000'}}>
                  False Alarm
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {modalOpen && selectedFire &&
        ReactDOM.createPortal(
          <ActiveFireResolveModal
            fire={selectedFire}
            onClose={() => setModalOpen(false)}
          />,
          document.body
        )
      }
      {sidebarOpen && selectedFire &&
        <ActiveFireSidebar
          fire={selectedFire}
          onClose={() => setSidebarOpen(false)}
        />
      }
    </>
  );
}
