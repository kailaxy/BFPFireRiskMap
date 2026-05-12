import React, { useState, useEffect } from 'react';
import './AdminForecasts.css';
import { API_BASE_URL } from '../config';
import ForecastGraph from './ForecastGraph';

function adminGet(url) {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  return fetch(`${base}${url}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

function adminPost(url, body = {}) {
  const token = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  return fetch(`${base}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
}

export default function AdminForecasts() {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState('');
  const [expandedBarangay, setExpandedBarangay] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGraphBarangay, setSelectedGraphBarangay] = useState(null);

  useEffect(() => {
    loadForecasts();
  }, []);

  async function loadForecasts() {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGet('/api/forecasts/arima/all');
      
      if (!res.ok) {
        throw new Error('Failed to load forecasts');
      }
      
      const data = await res.json();
      // Filter out "Unknown" barangay entries - only show the 27 valid barangays
      const validForecasts = (data.barangays || []).filter(
        b => b.barangay && b.barangay.toLowerCase() !== 'unknown'
      );
      setForecasts(validForecasts);
      setLastUpdated(data.last_updated);
    } catch (err) {
      console.error('Error loading forecasts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateForecasts() {
    if (!confirm('Generate/Regenerate forecasts for all barangays? This may take several minutes.')) {
      return;
    }

    try {
      setGenerating(true);
      setGenerateMessage('Generating forecasts... This may take 2-5 minutes.');
      
      const res = await adminPost('/api/forecasts/generate-enhanced');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate forecasts');
      }
      
      const data = await res.json();
      setGenerateMessage(`✅ Successfully generated forecasts for ${data.barangays_processed} barangays!`);
      
      // Reload forecasts after 2 seconds
      setTimeout(() => {
        loadForecasts();
        setGenerateMessage('');
      }, 2000);
      
    } catch (err) {
      console.error('Error generating forecasts:', err);
      setGenerateMessage(`❌ Error: ${err.message}`);
      setTimeout(() => setGenerateMessage(''), 5000);
    } finally {
      setGenerating(false);
    }
  }

  function getRiskBadgeClass(riskLevel) {
    const level = (riskLevel || '').toLowerCase();
    if (level === 'high' || level === 'very high') return 'risk-badge risk-high';
    if (level === 'medium' || level === 'moderate') return 'risk-badge risk-medium';
    return 'risk-badge risk-low';
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatMonth(monthString) {
    if (!monthString) return 'N/A';
    const date = new Date(monthString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long'
    });
  }

  function toggleBarangay(barangayName) {
    setExpandedBarangay(expandedBarangay === barangayName ? null : barangayName);
  }

  const filteredForecasts = forecasts.filter(f => 
    f.barangay.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-forecasts">
        <div className="forecasts-header">
          <h2>🔮 Fire Risk Forecasts</h2>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading forecasts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-forecasts">
        <div className="forecasts-header">
          <h2>🔮 Fire Risk Forecasts</h2>
        </div>
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={loadForecasts} className="btn-retry">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-forecasts">
      <div className="forecasts-header">
        <div className="header-content">
          <h2>🔮 Fire Risk Forecasts</h2>
          <p className="header-subtitle">
            ARIMA/SARIMAX 12-Month Predictions by Barangay
          </p>
        </div>
        <div className="header-actions">
          <button 
            onClick={handleGenerateForecasts}
            disabled={generating}
            className="btn-generate"
          >
            {generating ? '⏳ Generating...' : '🔄 Generate/Regenerate'}
          </button>
        </div>
      </div>

      {generateMessage && (
        <div className={`generate-message ${generateMessage.startsWith('✅') ? 'success' : generateMessage.startsWith('❌') ? 'error' : 'info'}`}>
          {generateMessage}
        </div>
      )}

      <div className="forecasts-info">
        <div className="info-card">
          <span className="info-label">Total Barangays:</span>
          <span className="info-value">{forecasts.length}</span>
        </div>
        <div className="info-card">
          <span className="info-label">Last Updated:</span>
          <span className="info-value">{formatDate(lastUpdated)}</span>
        </div>
        <div className="info-card search-card">
          <input
            type="text"
            placeholder="🔍 Search barangay..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {filteredForecasts.length === 0 ? (
        <div className="empty-state">
          <p>📭 {searchTerm ? 'No barangays match your search.' : 'No forecasts available.'}</p>
          {!searchTerm && (
            <button onClick={handleGenerateForecasts} className="btn-generate">
              Generate Forecasts
            </button>
          )}
        </div>
      ) : (
        <div className="forecasts-list">
          {filteredForecasts.map((barangayData) => {
            const isExpanded = expandedBarangay === barangayData.barangay;
            const forecasts = barangayData.forecasts || [];
            const nextMonth = forecasts[0];
            const avgPredicted = forecasts.reduce((sum, f) => sum + f.predicted_cases, 0) / forecasts.length;
            
            return (
              <div key={barangayData.barangay} className="forecast-card">
                <div 
                  className="forecast-card-header"
                  onClick={() => toggleBarangay(barangayData.barangay)}
                >
                  <div className="header-left">
                    <h3>{barangayData.barangay}</h3>
                    <span className="forecast-count">
                      {forecasts.length} months forecasted
                    </span>
                  </div>
                  <div className="header-right">
                    {nextMonth && (
                      <>
                        <div className="next-month-info">
                          <span className="label">Next Month:</span>
                          <span className="value">{nextMonth.predicted_cases.toFixed(1)} cases</span>
                          <span className={getRiskBadgeClass(nextMonth.risk_level)}>
                            {nextMonth.risk_level}
                          </span>
                        </div>
                        <span className="expand-icon">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="forecast-card-body">
                    <div className="forecast-summary">
                      <div className="summary-stat">
                        <span className="stat-label">12-Month Average:</span>
                        <span className="stat-value">{avgPredicted.toFixed(2)} cases/month</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-label">Model Used:</span>
                        <span className="stat-value">{forecasts[0]?.model_used || 'N/A'}</span>
                      </div>
                      <button 
                        className="btn-view-graph"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGraphBarangay(barangayData.barangay);
                        }}
                      >
                        📊 View Graph
                      </button>
                    </div>

                    <div className="forecast-table-wrapper">
                      <table className="forecast-table">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Predicted</th>
                            <th>Lower Bound</th>
                            <th>Upper Bound</th>
                            <th>Risk Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forecasts.map((forecast, idx) => (
                            <tr key={idx}>
                              <td>{formatMonth(forecast.month)}</td>
                              <td className="predicted-value">
                                {forecast.predicted_cases.toFixed(2)}
                              </td>
                              <td>{forecast.lower_bound.toFixed(2)}</td>
                              <td>{forecast.upper_bound.toFixed(2)}</td>
                              <td>
                                <span className={getRiskBadgeClass(forecast.risk_level)}>
                                  {forecast.risk_level}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedGraphBarangay && (
        <ForecastGraph 
          barangay={selectedGraphBarangay}
          onClose={() => setSelectedGraphBarangay(null)}
        />
      )}
    </div>
  );
}
