import React, { useContext, useState, useEffect } from 'react';
import { MapContext } from '../logic.jsx';
import './FireRiskLegend.css';

export default function FireRiskLegend() {
  const { showFireRisk, forecastMonth, setForecastMonth, fetchFireRiskForecasts } = useContext(MapContext);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Month cycling functions
  const changeMonth = (direction) => {
    const currentDate = new Date(forecastMonth);
    if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    setForecastMonth(currentDate);
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Fetch new forecast data when month changes
  useEffect(() => {
    if (showFireRisk && forecastMonth) {
      fetchFireRiskForecasts();
    }
  }, [forecastMonth, showFireRisk, fetchFireRiskForecasts]);

  // Check if we're on mobile and set initial collapsed state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    
    // Auto-collapse by default unless user has manually expanded
    const userPreference = localStorage.getItem('legendExpanded');
    if (userPreference === null) {
      setIsCollapsed(true); // Default to collapsed for both mobile and desktop
    } else {
      setIsCollapsed(userPreference === 'false');
    }
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    // Remember user preference for both mobile and desktop
    localStorage.setItem('legendExpanded', newCollapsed ? 'false' : 'true');
  };

  if (!showFireRisk) return null;

  // Collapsed state - show icon button similar to layer controls
  if (isCollapsed) {
    return (
      <div 
        className="fire-risk-legend-collapsed"
        onClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && toggleCollapsed()}
      >
        <span className="legend-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="legend-tooltip">Fire Risk Legend</span>
      </div>
    );
  }

  // Expanded state - show full legend
  return (
    <div className="fire-risk-legend">
      <div className="legend-header">
        <div className="legend-title-row">
          <h4>🔥 Fire Risk Forecast</h4>
          <button 
            className="legend-collapse-btn"
            onClick={toggleCollapsed}
            aria-label="Collapse legend"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        {/* Month Cycling Controls */}
        <div className="month-controls">
          <button 
            className="month-nav-btn"
            onClick={() => changeMonth('prev')}
            aria-label="Previous month"
            title="Previous month"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
              <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <span className="current-month">
            {formatMonthYear(forecastMonth)}
          </span>
          
          <button 
            className="month-nav-btn"
            onClick={() => changeMonth('next')}
            aria-label="Next month"
            title="Next month"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
              <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="legend-disclaimer">
          <small>⚠️ Predictions are algorithm-generated estimates</small>
        </div>
      </div>
      <div className="legend-items">
        <div className="legend-item">
          <div className="legend-color high"></div>
          <span>High risk (≥1 predicted cases)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color medium"></div>
          <span>Medium risk (0.5-0.99 cases)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color low-moderate"></div>
          <span>Low-Moderate risk (0.2-0.49 cases)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color very-low"></div>
          <span>Very Low risk (&lt;0.2 cases)</span>
        </div>
      </div>
    </div>
  );
}