import React, { useContext } from "react";
import { MapContext } from "../logic.jsx";
import FireRiskLegend from "./FireRiskLegend";

export default function LayersControl() {
  const {
    showHydrants,
    showBoundaries,
    showFireStations,
    showFireRisk,
    showHistoricalFires,
    showLayersPanel,
    setShowHydrants,
    setShowBoundaries,
    setShowFireStations,
    setShowFireRisk,
    setShowHistoricalFires,
    setShowLayersPanel,
    setSelectedHydrant,
    setSelectedStation,
    setSelectedBarangay,
    setShowSidebar,
    historicalFiltersOpen,
    setHistoricalFiltersOpen,
  } = useContext(MapContext);

  return (
    <div className={`layers-control ${showLayersPanel ? "open" : ""}`}>
      <div className="layer-stack" aria-hidden={false}>
        <div
          className={`layer-stack-item layer-hydrants ${showHydrants ? 'on' : 'off'}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setShowHydrants((v) => !v);
            setSelectedHydrant(null);
            setSelectedStation(null);
            setSelectedBarangay(null);
            setShowSidebar(false);
          }}
        >
          <span className="layer-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor">
              <path d="M12 2v3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 5v2H6a2 2 0 0 0-2 2v3a3 3 0 0 0 3 3v2h8v-2a3 3 0 0 0 3-3V9a2 2 0 0 0-2-2h-2V5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 14h6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="layer-tooltip">Fire Hydrants</span>
        </div>

        <div
          className={`layer-stack-item layer-boundaries ${showBoundaries ? 'on' : 'off'}`}
          role="button"
          tabIndex={0}
          onClick={() => setShowBoundaries((v) => !v)}
        >
          <span className="layer-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor">
              <path d="M3 12l4-8 5 3 6 0 3 5-2 8-9-3-7-5z" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="layer-tooltip">Barangay Boundaries</span>
        </div>

        <div
          className={`layer-stack-item layer-stations ${showFireStations ? 'on' : 'off'}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setShowFireStations((v) => !v);
            setSelectedHydrant(null);
            setSelectedStation(null);
            setSelectedBarangay(null);
            setShowSidebar(false);
          }}
        >
          <span className="layer-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor">
              <path d="M3 21v-13l9-4 9 4v13" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 21V12h6v9" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="layer-tooltip">Fire Stations</span>
        </div>

        <div className="layer-fire-risk-row">
          <div
            className={`layer-stack-item layer-fire-risk ${showFireRisk ? 'on' : 'off'}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setShowFireRisk((v) => !v);
              setSelectedHydrant(null);
              setSelectedStation(null);
              setSelectedBarangay(null);
              setShowSidebar(false);
            }}
          >
            <span className="layer-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.9 10.2c.2-.2.5-.3.8-.3s.6.1.8.3c.2.2.3.5.3.8s-.1.6-.3.8c-.2.2-.5.3-.8.3s-.6-.1-.8-.3c-.2-.2-.3-.5-.3-.8s.1-.6.3-.8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="layer-tooltip">Fire Risk Forecast</span>
          </div>
          <FireRiskLegend />
        </div>

        <div className="layer-historical-fires-row">
          <div
            className={`layer-stack-item layer-historical-fires ${showHistoricalFires ? 'on' : 'off'}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              const newState = !showHistoricalFires;
              setShowHistoricalFires(newState);
              if (newState) {
                setHistoricalFiltersOpen(true);
              } else {
                setHistoricalFiltersOpen(false);
              }
              setSelectedHydrant(null);
              setSelectedStation(null);
              setSelectedBarangay(null);
              setShowSidebar(false);
            }}
          >
            <span className="layer-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor">
                <path d="M12 8v4l3 3" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" strokeWidth="2.0" />
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="layer-tooltip">Historical Fires</span>
          </div>
          {showHistoricalFires && (
            <button
              className="filter-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Filter toggle clicked, current state:', historicalFiltersOpen);
                setHistoricalFiltersOpen(prev => !prev);
              }}
              title="Toggle filters"
            >
              <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                <rect x="1" y="3" width="22" height="4" fill="#ff9800" rx="1.5" />
                <rect x="3" y="10" width="18" height="4" fill="#ff9800" rx="1.5" />
                <rect x="5" y="17" width="14" height="4" fill="#ff9800" rx="1.5" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}