import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './ForecastGraph.css';
import { API_BASE_URL } from '../config';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ForecastGraph({ barangay, onClose }) {
  const [graphData, setGraphData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGraphData();
  }, [barangay]);

  async function loadGraphData() {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const base = API_BASE_URL.replace(/\/$/, '');
      const encodedBarangay = encodeURIComponent(barangay);
      
      const response = await fetch(`${base}/api/forecasts/graphs/${encodedBarangay}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No graph data available. Please generate forecasts first.');
        }
        throw new Error('Failed to load graph data');
      }

      const result = await response.json();
      
      if (result.success) {
        setGraphData(result.data);
        setMetadata(result.metadata);
      } else {
        throw new Error(result.message || 'Failed to load graph data');
      }
    } catch (err) {
      console.error('Error loading graph data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatChartData() {
    if (!graphData) return null;

    // Combine all dates and sort
    const allDates = new Set([
      ...graphData.actual.map(d => d.date),
      ...graphData.fitted.map(d => d.date),
      ...graphData.forecast.map(d => d.date),
      ...graphData.moving_avg_6.map(d => d.date)
    ]);
    
    const sortedDates = Array.from(allDates).sort();

    // Create value maps for easy lookup
    const actualMap = new Map(graphData.actual.map(d => [d.date, d.value]));
    const fittedMap = new Map(graphData.fitted.map(d => [d.date, d.value]));
    const forecastMap = new Map(graphData.forecast.map(d => [d.date, d.value]));
    const ciLowerMap = new Map(graphData.ci_lower.map(d => [d.date, d.value]));
    const ciUpperMap = new Map(graphData.ci_upper.map(d => [d.date, d.value]));
    const movingAvgMap = new Map(graphData.moving_avg_6.map(d => [d.date, d.value]));

    // Format dates for display (YYYY-MM)
    const labels = sortedDates.map(date => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Actual Fire Incidents',
          data: sortedDates.map(date => actualMap.get(date) ?? null),
          borderColor: 'rgb(0, 0, 0)',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.1,
          spanGaps: false
        },
        {
          label: 'Fitted Values',
          data: sortedDates.map(date => fittedMap.get(date) ?? null),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
          tension: 0.1,
          spanGaps: false
        },
        {
          label: '6-Month Moving Average',
          data: sortedDates.map(date => movingAvgMap.get(date) ?? null),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          spanGaps: false
        },
        {
          label: 'Forecast',
          data: sortedDates.map(date => forecastMap.get(date) ?? null),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 3,
          borderDash: [10, 5],
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.1,
          spanGaps: false
        },
        {
          label: '95% Confidence Interval',
          data: sortedDates.map(date => {
            const lower = ciLowerMap.get(date);
            const upper = ciUpperMap.get(date);
            if (lower !== undefined && upper !== undefined) {
              return [lower, upper];
            }
            return null;
          }),
          borderColor: 'rgba(255, 99, 132, 0.2)',
          backgroundColor: 'rgba(255, 99, 132, 0.15)',
          fill: true,
          pointRadius: 0,
          borderWidth: 0,
          spanGaps: false,
          // Custom rendering for confidence interval
          segment: {
            borderColor: ctx => 'rgba(255, 99, 132, 0.2)',
            backgroundColor: ctx => 'rgba(255, 99, 132, 0.15)'
          }
        }
      ]
    };
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: `Fire Incident Forecast - ${barangay}`,
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2) + ' incidents';
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Month',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 30, // Show more date labels
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)' // Subtle grid lines
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Fire Incident Count (Estimated)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        beginAtZero: true, // Start from zero like Colab graph
        suggestedMax: 6, // Match Colab's max of 6 for consistency
        ticks: {
          callback: function(value) {
            return value.toFixed(1); // Show 1 decimal place
          },
          // More tick marks for better granularity
          stepSize: 1
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)' // Subtle grid lines
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="forecast-graph-modal">
        <div className="graph-modal-content">
          <div className="graph-modal-header">
            <h2>📊 Loading Graph...</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="graph-loading">
            <div className="spinner"></div>
            <p>Loading graph data for {barangay}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forecast-graph-modal">
        <div className="graph-modal-content">
          <div className="graph-modal-header">
            <h2>📊 Graph Error</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="graph-error">
            <p>❌ {error}</p>
            <button onClick={loadGraphData} className="btn-retry">
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const chartData = formatChartData();

  return (
    <div className="forecast-graph-modal" onClick={onClose}>
      <div className="graph-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="graph-modal-header">
          <div className="header-left">
            <h2>📊 Forecast Visualization</h2>
            <p className="barangay-name">{barangay}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {metadata && (
          <div className="graph-metadata">
            <div className="metadata-item">
              <span className="label">Total Records:</span>
              <span className="value">{metadata.total_records}</span>
            </div>
            <div className="metadata-item">
              <span className="label">Date Range:</span>
              <span className="value">
                {new Date(metadata.date_range.start).getFullYear()} - {new Date(metadata.date_range.end).getFullYear()}
              </span>
            </div>
            <div className="metadata-item">
              <span className="label">Forecast Months:</span>
              <span className="value">{metadata.datasets.forecast}</span>
            </div>
          </div>
        )}

        <div className="graph-container">
          {chartData && <Line data={chartData} options={chartOptions} />}
        </div>

        <div className="graph-legend-info">
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: 'rgb(0, 0, 0)'}}></span>
            <span className="legend-label">Actual: Historical fire incident data (2010-2024)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: 'rgb(54, 162, 235)'}}></span>
            <span className="legend-label">Fitted: Model's fitted values on historical data</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: 'rgb(255, 159, 64)'}}></span>
            <span className="legend-label">Moving Avg: 6-month rolling average</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: 'rgb(255, 99, 132)'}}></span>
            <span className="legend-label">Forecast: 12-month prediction (dashed line)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: 'rgba(255, 99, 132, 0.15)'}}></span>
            <span className="legend-label">95% CI: Confidence interval (shaded area)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
