import React, { useContext, useMemo } from 'react';
import { MapContext } from '../logic.jsx';
import './HistoricalFiresSidebar.css';

export default function HistoricalFiresSidebar() {
  const {
    selectedHistoricalBarangay,
    setSelectedHistoricalBarangay,
    historicalFires,
    historicalFiresSidebarOpen,
    setHistoricalFiresSidebarOpen,
    mapRef,
  } = useContext(MapContext);

  // Get fires for the selected barangay
  const firesInBarangay = useMemo(() => {
    if (!selectedHistoricalBarangay || !historicalFires) return [];
    return historicalFires.filter(f => f.barangay === selectedHistoricalBarangay);
  }, [selectedHistoricalBarangay, historicalFires]);

  const [selectedFire, setSelectedFire] = React.useState(null);

  // Debug logging
  React.useEffect(() => {
    console.log('HistoricalFiresSidebar state:', {
      historicalFiresSidebarOpen,
      selectedHistoricalBarangay,
      firesCount: firesInBarangay.length
    });
  }, [historicalFiresSidebarOpen, selectedHistoricalBarangay, firesInBarangay]);

  if (!historicalFiresSidebarOpen || !selectedHistoricalBarangay) return null;

  const handleClose = () => {
    setHistoricalFiresSidebarOpen(false);
    setSelectedHistoricalBarangay(null);
    setSelectedFire(null);
  };

  const handleFireClick = (fire) => {
    setSelectedFire(fire);
    // Pan to fire location if coordinates exist
    if (fire.lat && fire.lng && mapRef && mapRef.current) {
      mapRef.current.panTo({ lat: fire.lat, lng: fire.lng });
      mapRef.current.setZoom(16);
    }
  };

  const handleBack = () => {
    setSelectedFire(null);
  };

  if (selectedFire) {
    // Detail view for a single fire
    return (
      <div className="historical-fires-sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={handleBack}>
            ← Back
          </button>
          <button className="close-btn" onClick={handleClose}>✕</button>
        </div>

        <div className="fire-detail">
          <h2>Fire Incident Details</h2>
          
          <div className="detail-section">
            <h3>Location</h3>
            <p><strong>Barangay:</strong> {selectedFire.barangay || 'Unknown'}</p>
            <p><strong>Address:</strong> {selectedFire.address || 'Not specified'}</p>
          </div>

          <div className="detail-section">
            <h3>Incident Information</h3>
            <p><strong>Date:</strong> {selectedFire.reported_at ? new Date(selectedFire.reported_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Unknown'}</p>
            <p><strong>Alarm Level:</strong> <span className="alarm-badge">{selectedFire.alarm_level || 'Unknown'}</span></p>
            {selectedFire.cause && <p><strong>Cause:</strong> {selectedFire.cause}</p>}
            {selectedFire.type_of_occupancy && <p><strong>Type of Occupancy:</strong> {selectedFire.type_of_occupancy}</p>}
          </div>

          <div className="detail-section">
            <h3>Impact</h3>
            {selectedFire.casualties > 0 && (
              <p className="casualty-info"><strong>Casualties:</strong> <span className="casualty-count">{selectedFire.casualties}</span></p>
            )}
            {selectedFire.injuries > 0 && (
              <p className="injury-info"><strong>Injuries:</strong> <span className="injury-count">{selectedFire.injuries}</span></p>
            )}
            {selectedFire.estimated_damage > 0 && (
              <p><strong>Estimated Damage:</strong> ₱{parseFloat(selectedFire.estimated_damage).toLocaleString()}</p>
            )}
            {!selectedFire.casualties && !selectedFire.injuries && !selectedFire.estimated_damage && (
              <p className="no-impact">No casualties, injuries, or damage reported</p>
            )}
          </div>

          {selectedFire.actions_taken && (
            <div className="detail-section">
              <h3>Actions Taken</h3>
              <p>{selectedFire.actions_taken}</p>
            </div>
          )}

          {(selectedFire.reported_by || selectedFire.verified_by) && (
            <div className="detail-section">
              <h3>Reporting</h3>
              {selectedFire.reported_by && <p><strong>Reported By:</strong> {selectedFire.reported_by}</p>}
              {selectedFire.verified_by && <p><strong>Verified By:</strong> {selectedFire.verified_by}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view of fires in barangay
  return (
    <div className="historical-fires-sidebar">
      <div className="sidebar-header">
        <h2>Historical Fires in {selectedHistoricalBarangay}</h2>
        <button className="close-btn" onClick={handleClose}>✕</button>
      </div>

      <div className="fires-summary">
        <div className="summary-stat">
          <div className="stat-number">{firesInBarangay.length}</div>
          <div className="stat-label">Total Fires</div>
        </div>
      </div>

      <div className="fires-list">
        {firesInBarangay.length === 0 ? (
          <div className="no-fires">
            <p>No historical fires found in this barangay.</p>
          </div>
        ) : (
          firesInBarangay.map((fire, index) => (
            <div 
              key={`fire-${index}`} 
              className="fire-item"
              onClick={() => handleFireClick(fire)}
            >
              <div className="fire-item-header">
                <div className="fire-date">
                  {fire.reported_at ? new Date(fire.reported_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'Date unknown'}
                </div>
                <div className={`fire-alarm ${fire.alarm_level?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                  {fire.alarm_level || 'Unknown'}
                </div>
              </div>
              
              <div className="fire-item-body">
                <p className="fire-address">{fire.address || 'Address not specified'}</p>
                {fire.cause && <p className="fire-cause"><strong>Cause:</strong> {fire.cause}</p>}
                {fire.type_of_occupancy && <p className="fire-occupancy"><strong>Occupancy:</strong> {fire.type_of_occupancy}</p>}
                
                {(fire.casualties > 0 || fire.injuries > 0 || fire.estimated_damage > 0) && (
                  <div className="fire-impact">
                    {fire.casualties > 0 && <span className="impact-badge casualties">{fire.casualties} casualties</span>}
                    {fire.injuries > 0 && <span className="impact-badge injuries">{fire.injuries} injuries</span>}
                    {fire.estimated_damage > 0 && <span className="impact-badge damage">₱{parseFloat(fire.estimated_damage).toLocaleString()}</span>}
                  </div>
                )}
              </div>

              <div className="fire-item-footer">
                <span className="view-details">View details →</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
