import React, { useContext, useState, useEffect } from 'react';
import { MapContext } from '../logic.jsx';
import { API_BASE_URL } from '../config';

export default function HistoricalFiresFilter() {
  const {
    historicalFilters,
    setHistoricalFilters,
    historicalFiltersOpen,
    setHistoricalFiltersOpen,
    fetchHistoricalFires,
    barangays,
  } = useContext(MapContext);

  const [barangayList, setBarangayList] = useState([]);

  // Fetch barangay list from barangays context
  useEffect(() => {
    if (barangays && Array.isArray(barangays)) {
      const names = barangays
        .map(b => b.properties?.name)
        .filter(Boolean)
        .sort();
      setBarangayList(names);
    }
  }, [barangays]);

  const handleFilterChange = (field, value) => {
    setHistoricalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyFilters = () => {
    fetchHistoricalFires();
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      month: '',
      year: '',
      barangay: '',
      occupancy: '',
      cause: '',
      alarm: ''
    };
    setHistoricalFilters(clearedFilters);
    // Fetch immediately with cleared filters
    fetchHistoricalFires(clearedFilters);
  };

  const currentYear = new Date().getFullYear();
  // Only show years from 2010 to current year (when records started)
  const startYear = 2010;
  const yearCount = currentYear - startYear + 1;
  const years = Array.from({ length: yearCount }, (_, i) => currentYear - i);

  // Debug logging
  React.useEffect(() => {
    console.log('HistoricalFiresFilter state:', { historicalFiltersOpen });
  }, [historicalFiltersOpen]);

  if (!historicalFiltersOpen) return null;

  return (
    <div className="historical-fires-filter">
      <div className="filter-header">
        <h3>Filter Historical Fires</h3>
        <button 
          className="close-btn"
          onClick={() => setHistoricalFiltersOpen(false)}
          aria-label="Close filters"
        >
          ✕
        </button>
      </div>

      <div className="filter-content">
        <div className="filter-row">
          <label>
            Month
            <select 
              value={historicalFilters.month} 
              onChange={(e) => handleFilterChange('month', e.target.value)}
            >
              <option value="">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </label>

          <label>
            Year
            <select 
              value={historicalFilters.year} 
              onChange={(e) => handleFilterChange('year', e.target.value)}
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="filter-row">
          <label>
            Barangay
            <select 
              value={historicalFilters.barangay} 
              onChange={(e) => handleFilterChange('barangay', e.target.value)}
            >
              <option value="">All Barangays</option>
              {barangayList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          <label>
            Type of Occupancy
            <select 
              value={historicalFilters.occupancy} 
              onChange={(e) => handleFilterChange('occupancy', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Industrial">Industrial</option>
              <option value="Institutional">Institutional</option>
              <option value="Assembly">Assembly</option>
              <option value="Educational">Educational</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Recreational">Recreational</option>
              <option value="Mixed-Use">Mixed-Use</option>
              <option value="Storage">Storage</option>
              <option value="Transportation">Transportation</option>
              <option value="Agricultural">Agricultural</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>

        <div className="filter-row">
          <label>
            Cause
            <select 
              value={historicalFilters.cause} 
              onChange={(e) => handleFilterChange('cause', e.target.value)}
            >
              <option value="">All Causes</option>
              <option value="Electrical">Electrical</option>
              <option value="Structural">Structural</option>
              <option value="Vehicular">Vehicular</option>
              <option value="Post Fire">Post Fire</option>
              <option value="Accidental">Accidental</option>
              <option value="Intentional">Intentional</option>
              <option value="Natural">Natural</option>
              <option value="Cooking">Cooking</option>
              <option value="Smoking">Smoking</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Alarm Level
            <select 
              value={historicalFilters.alarm} 
              onChange={(e) => handleFilterChange('alarm', e.target.value)}
            >
              <option value="">All Alarms</option>
              <option value="Fire Out">Fire Out Upon Arrival</option>
              <option value="Unresponded">Unresponded</option>
              <option value="1st Alarm">1st Alarm</option>
              <option value="2nd Alarm">2nd Alarm</option>
              <option value="3rd Alarm">3rd Alarm</option>
              <option value="4th Alarm">4th Alarm</option>
              <option value="5th Alarm">5th Alarm</option>
              <option value="Task Force Alpha">Task Force Alpha</option>
              <option value="Task Force Bravo">Task Force Bravo</option>
              <option value="Task Force Charlie">Task Force Charlie</option>
              <option value="General Alarm">General Alarm</option>
            </select>
          </label>
        </div>

        <div className="filter-actions">
          <button 
            className="apply-btn"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </button>
          <button 
            className="clear-btn"
            onClick={handleClearFilters}
          >
            Clear All
          </button>
        </div>
      </div>

      <style jsx>{`
        .historical-fires-filter {
          position: fixed;
          top: 80px;
          right: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          width: 400px;
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          z-index: 1000;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
          background: #f8f9fa;
          border-radius: 8px 8px 0 0;
        }

        .filter-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .close-btn {
          background: #333;
          border: 1px solid #555;
          font-size: 20px;
          color: white;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
          font-weight: bold;
        }

        .close-btn:hover {
          background: #000;
          color: white;
          border-color: #333;
          transform: scale(1.05);
        }

        .filter-content {
          padding: 20px;
        }

        .filter-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        label {
          display: flex;
          flex-direction: column;
          font-size: 13px;
          font-weight: 500;
          color: #555;
          gap: 6px;
        }

        select {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        select:hover {
          border-color: #999;
        }

        select:focus {
          outline: none;
          border-color: #d32f2f;
          box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1);
        }

        .filter-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
        }

        .apply-btn,
        .clear-btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .apply-btn {
          background: #d32f2f;
          color: white;
        }

        .apply-btn:hover {
          background: #b71c1c;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
        }

        .clear-btn {
          background: #f5f5f5;
          color: #555;
        }

        .clear-btn:hover {
          background: #e0e0e0;
        }

        @media (max-width: 768px) {
          .historical-fires-filter {
            top: 60px;
            right: 10px;
            left: 10px;
            width: auto;
          }

          .filter-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
