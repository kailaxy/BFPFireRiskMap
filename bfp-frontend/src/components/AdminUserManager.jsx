import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

function adminGet(url) {
  const t = localStorage.getItem('token');
  const base = API_BASE_URL.replace(/\/$/, '');
  const full = url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  return fetch(full, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json());
}

export default function AdminUserManager() {
  // Client-side admin guard
  let currentUser = null;
  try { const s = localStorage.getItem('user'); if (s) currentUser = JSON.parse(s); } catch (err) { }
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ padding: 20 }}>
        <h2>Access denied</h2>
        <p>You must be logged in as an admin to access this page.</p>
      </div>
    );
  }

  const [counts, setCounts] = useState({ users: '-', hydrants: '-', barangays: '-', stations: '-', activeFires: '-' });
  const [loading, setLoading] = useState(true);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [selectedOccupancy, setSelectedOccupancy] = useState('');
  const [selectedCause, setSelectedCause] = useState('');
  const [selectedAlarm, setSelectedAlarm] = useState('');
  const [barangays, setBarangays] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [u, h, b, s, a] = await Promise.all([
          adminGet('/api/users'),
          adminGet('/api/hydrants/admin'),
          adminGet('/api/barangays/admin'),
          adminGet('/api/firestation/admin'),
          adminGet('/api/active_fires')
        ]);
        if (!mounted) return;
        setCounts({ 
          users: Array.isArray(u.rows) ? u.rows.length : (u.count || '-'), 
          hydrants: Array.isArray(h.rows) ? h.rows.length : (h.count || '-'), 
          barangays: Array.isArray(b.rows) ? b.rows.length : (b.count || '-'), 
          stations: Array.isArray(s.rows) ? s.rows.length : (s.count || '-'),
          activeFires: (a.features && Array.isArray(a.features)) ? a.features.length : (Array.isArray(a) ? a.length : '-')
        });
        // Store barangays for filter dropdown
        if (Array.isArray(b.rows)) {
          setBarangays(b.rows.map(br => br.name || br.barangay_name).filter(Boolean).sort());
        }
      } catch (err) {
        // ignore, show dashes
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handlePrintReport = () => {
    // Get the report content
    const reportElement = document.querySelector('.monthly-report');
    if (!reportElement) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // Write the HTML content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Fire Incident Report</title>
          <style>
            body {
              font-family: system-ui, Arial, sans-serif;
              padding: 40px;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border: 1px solid #dee2e6;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            h2, h3, h4 {
              color: #007bff;
              page-break-after: avoid;
            }
            @media print {
              body {
                padding: 20px;
              }
              table {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${reportElement.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  const generateMonthlyReport = async () => {
    setReportLoading(true);
    setReportError(null);
    setMonthlyReport(null); // Clear previous report
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.set('month', selectedMonth);
      if (selectedYear) params.set('year', selectedYear);
      if (selectedBarangay) params.set('barangay', selectedBarangay);
      if (selectedOccupancy) params.set('occupancy', selectedOccupancy);
      if (selectedCause) params.set('cause', selectedCause);
      if (selectedAlarm) params.set('alarm', selectedAlarm);
      
      const response = await adminGet(`/api/admin/generate-monthly-report-simple-fix?${params.toString()}`);
      
      // Validate response has the expected structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from server');
      }
      
      if (response.error) {
        throw new Error(response.error + (response.details ? ': ' + response.details : ''));
      }
      
      // Check if report has required fields
      if (!response.report_info || !response.summary) {
        throw new Error('Incomplete report data received from server');
      }
      
      setMonthlyReport(response);
    } catch (err) {
      const errorMessage = err.message || 'Failed to generate report';
      setReportError(errorMessage);
      console.error('Report generation error:', err);
      
      // If it's a network error, provide more helpful message
      if (errorMessage.includes('fetch')) {
        setReportError('Unable to connect to server. Please try again later.');
      }
    } finally {
      setReportLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    // Handle non-numeric values (N/A, ---, etc.)
    if (typeof amount === 'string' && (amount.includes('N/A') || amount.includes('---') || amount.includes('Incomplete'))) {
      return amount;
    }
    
    // Handle numeric values
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(numericAmount)) {
      return '--- (Incomplete data)';
    }
    
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericAmount);
  };

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  // Generate years from 2010 (earliest historical data) to current year
  const startYear = 2010;
  const yearCount = currentYear - startYear + 1;
  const years = Array.from({length: yearCount}, (_, i) => currentYear - i);
  const months = [
    {value: 1, name: 'January'}, {value: 2, name: 'February'}, {value: 3, name: 'March'},
    {value: 4, name: 'April'}, {value: 5, name: 'May'}, {value: 6, name: 'June'},
    {value: 7, name: 'July'}, {value: 8, name: 'August'}, {value: 9, name: 'September'},
    {value: 10, name: 'October'}, {value: 11, name: 'November'}, {value: 12, name: 'December'}
  ];

  return (
    <div style={{ 
      padding: 20, 
      height: '100%', 
      overflowY: 'auto',
      maxHeight: '100vh',
      paddingBottom: 40 
    }}>
      <h2>Overview</h2>
      {loading ? <div>Loading dashboard…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
          <div style={{ background: 'var(--bg-white)', padding: 12, borderRadius: 8, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Users</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{counts.users}</div>
          </div>
          <div style={{ background: 'var(--bg-white)', padding: 12, borderRadius: 8, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Hydrants</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{counts.hydrants}</div>
          </div>
          <div style={{ background: 'var(--bg-white)', padding: 12, borderRadius: 8, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Barangays</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{counts.barangays}</div>
          </div>
          <div style={{ background: 'var(--bg-white)', padding: 12, borderRadius: 8, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Stations</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{counts.stations}</div>
          </div>
          <div style={{ background: 'var(--bg-white)', padding: 12, borderRadius: 8, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Active Fires</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: counts.activeFires > 0 ? '#dc3545' : 'inherit' }}>{counts.activeFires}</div>
          </div>
        </div>
      )}

      {/* Monthly Reports Section */}
      <div style={{ 
        marginTop: 40, 
        background: 'var(--bg-white)', 
        padding: 20, 
        borderRadius: 8, 
        boxShadow: '0 6px 18px rgba(15,23,42,0.06)',
        maxHeight: '80vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          📊 Monthly Reports
        </h3>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="">All Months</option>
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.name}</option>
            ))}
          </select>
          
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="">All Years</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select 
            value={selectedBarangay} 
            onChange={(e) => setSelectedBarangay(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="">All Barangays</option>
            {barangays.map(barangay => (
              <option key={barangay} value={barangay}>{barangay}</option>
            ))}
          </select>

          <select 
            value={selectedOccupancy} 
            onChange={(e) => setSelectedOccupancy(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="">All Occupancies</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Industrial">Industrial</option>
            <option value="Place of Assembly">Place of Assembly</option>
            <option value="Institutional">Institutional</option>
            <option value="Other">Other</option>
          </select>

          <select 
            value={selectedCause} 
            onChange={(e) => setSelectedCause(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="">All Causes</option>
            <option value="Structural">Structural</option>
            <option value="Vehicular">Vehicular</option>
            <option value="Grass/Brush">Grass/Brush</option>
            <option value="Electrical">Electrical</option>
            <option value="Chemical">Chemical</option>
            <option value="Other">Other</option>
          </select>

          <select 
            value={selectedAlarm} 
            onChange={(e) => setSelectedAlarm(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }}
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
          
          <button 
            onClick={generateMonthlyReport} 
            disabled={reportLoading}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4, 
              cursor: reportLoading ? 'not-allowed' : 'pointer',
              opacity: reportLoading ? 0.6 : 1
            }}
          >
            {reportLoading ? 'Generating...' : 'Generate Report'}
          </button>
          
          {monthlyReport && (
            <>
              <button 
                onClick={handlePrintReport}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4, 
                  cursor: 'pointer'
                }}
              >
                📄 Download PDF
              </button>
              <button 
                onClick={() => setMonthlyReport(null)}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#6c757d', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4, 
                  cursor: 'pointer',
                  marginLeft: 8
                }}
              >
                ✖️ Close Report
              </button>
            </>
          )}
        </div>

        {reportError && (
          <div style={{ color: '#dc3545', padding: 12, backgroundColor: '#f8d7da', borderRadius: 4, marginBottom: 16 }}>
            Error: {reportError}
          </div>
        )}

        {monthlyReport && monthlyReport.report_info && (
          <div className="monthly-report" style={{ 
            lineHeight: 1.6, 
            maxHeight: 'none',
            overflow: 'visible',
            paddingBottom: 20,
            position: 'relative'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 30, borderBottom: '2px solid #007bff', paddingBottom: 20 }}>
              <h2 style={{ color: '#007bff', marginBottom: 8 }}>BUREAU OF FIRE PROTECTION – MANDALUYONG CITY</h2>
              <h3 style={{ marginBottom: 8 }}>Monthly Fire Incident Report</h3>
              <div style={{ fontSize: 14, color: '#666' }}>
                <p><strong>Month Covered:</strong> {monthlyReport.report_info.month_covered}</p>
                <p><strong>Report Generated:</strong> {monthlyReport.report_info.report_generated}</p>
                <p><strong>Prepared by:</strong> {monthlyReport.report_info.prepared_by}</p>
              </div>
            </div>

            {/* Summary Section */}
            <div style={{ marginBottom: 30 }}>
              <h4 style={{ color: '#007bff', marginBottom: 16 }}>🔥 1. Summary of Fire Incidents</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: 12, textAlign: 'left', border: '1px solid #dee2e6' }}>Metric</th>
                    <th style={{ padding: 12, textAlign: 'left', border: '1px solid #dee2e6' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: 12, border: '1px solid #dee2e6' }}>Total Reported Incidents</td>
                    <td style={{ padding: 12, border: '1px solid #dee2e6', fontWeight: 'bold' }}>{monthlyReport.summary.total_incidents}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 12, border: '1px solid #dee2e6' }}>Average Alarm Level</td>
                    <td style={{ padding: 12, border: '1px solid #dee2e6' }}>{monthlyReport.summary.avg_alarm_level}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 12, border: '1px solid #dee2e6' }}>Total Casualties</td>
                    <td style={{ padding: 12, border: '1px solid #dee2e6', color: typeof monthlyReport.summary.total_casualties === 'number' && monthlyReport.summary.total_casualties > 0 ? '#dc3545' : 'inherit' }}>
                      {typeof monthlyReport.summary.total_casualties === 'string' ? monthlyReport.summary.total_casualties : 
                       `${monthlyReport.summary.total_casualties} ${monthlyReport.summary.total_casualties > 0 ? 'Fatalities' : 'None'}`}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: 12, border: '1px solid #dee2e6' }}>Total Injuries</td>
                    <td style={{ padding: 12, border: '1px solid #dee2e6', color: typeof monthlyReport.summary.total_injuries === 'number' && monthlyReport.summary.total_injuries > 0 ? '#ffc107' : 'inherit' }}>
                      {typeof monthlyReport.summary.total_injuries === 'string' ? monthlyReport.summary.total_injuries : 
                       `${monthlyReport.summary.total_injuries} ${monthlyReport.summary.total_injuries > 0 ? 'Persons Injured' : 'None'}`}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: 12, border: '1px solid #dee2e6' }}>Total Estimated Damage</td>
                    <td style={{ padding: 12, border: '1px solid #dee2e6', fontWeight: 'bold', color: '#28a745' }}>
                      {formatCurrency(monthlyReport.summary.total_damage)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: 12, border: '1px solid #dee2e6' }}>Average Incident Duration</td>
                    <td style={{ padding: 12, border: '1px solid #dee2e6' }}>{monthlyReport.summary.avg_duration} minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Barangay Incidents */}
            {monthlyReport.barangay_incidents.length > 0 && (
              <div style={{ marginBottom: 30 }}>
                <h4 style={{ color: '#007bff', marginBottom: 16 }}>📍 2. Incidents by Barangay</h4>
                
                {/* Bar Chart */}
                {monthlyReport.charts && monthlyReport.charts.barangay_bar_chart && (
                  <div style={{ marginBottom: 24, textAlign: 'center' }}>
                    <img 
                      src={monthlyReport.charts.barangay_bar_chart} 
                      alt="Incidents by Barangay Chart" 
                      style={{ maxWidth: '100%', height: 'auto', border: '1px solid #dee2e6', borderRadius: 4 }}
                    />
                  </div>
                )}
                
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: 12, textAlign: 'left', border: '1px solid #dee2e6' }}>Barangay</th>
                      <th style={{ padding: 12, textAlign: 'center', border: '1px solid #dee2e6' }}>Incidents</th>
                      <th style={{ padding: 12, textAlign: 'right', border: '1px solid #dee2e6' }}>Damage</th>
                      <th style={{ padding: 12, textAlign: 'center', border: '1px solid #dee2e6' }}>Casualties</th>
                      <th style={{ padding: 12, textAlign: 'center', border: '1px solid #dee2e6' }}>Injuries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.barangay_incidents.map((barangay, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: 12, border: '1px solid #dee2e6', fontWeight: 'bold' }}>{barangay.barangay}</td>
                        <td style={{ padding: 12, border: '1px solid #dee2e6', textAlign: 'center' }}>{barangay.incident_count}</td>
                        <td style={{ padding: 12, border: '1px solid #dee2e6', textAlign: 'right' }}>{formatCurrency(barangay.total_damage)}</td>
                        <td style={{ padding: 12, border: '1px solid #dee2e6', textAlign: 'center', color: barangay.casualties > 0 ? '#dc3545' : 'inherit' }}>
                          {barangay.casualties}
                        </td>
                        <td style={{ padding: 12, border: '1px solid #dee2e6', textAlign: 'center', color: barangay.injuries > 0 ? '#ffc107' : 'inherit' }}>
                          {barangay.injuries}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {monthlyReport.barangay_incidents.length > 0 && (
                  <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                    <strong>Barangay with the most incidents:</strong> {monthlyReport.barangay_incidents[0].barangay} ({monthlyReport.barangay_incidents[0].incident_count} incidents)
                  </p>
                )}
              </div>
            )}

            {/* Response Summary */}
            <div style={{ marginBottom: 30 }}>
              <h4 style={{ color: '#007bff', marginBottom: 16 }}>⏱️ 3. Response and Resolution Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div style={{ padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Average Duration</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>{monthlyReport.response_summary.avg_duration} min</div>
                </div>
                <div style={{ padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Fastest Resolution</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#28a745' }}>{monthlyReport.response_summary.fastest_duration} min</div>
                </div>
                <div style={{ padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Longest Incident</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#dc3545' }}>{monthlyReport.response_summary.longest_duration} min</div>
                </div>
                <div style={{ padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Total Resolved</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>{monthlyReport.response_summary.total_resolved}</div>
                </div>
              </div>
            </div>

            {/* Common Causes */}
            {monthlyReport.common_causes.length > 0 && (
              <div style={{ marginBottom: 30 }}>
                <h4 style={{ color: '#007bff', marginBottom: 16 }}>🧯 4. Common Causes of Fire</h4>
                
                {/* Pie Charts - Side by Side */}
                {monthlyReport.charts && (monthlyReport.charts.alarm_level_pie_chart || monthlyReport.charts.causes_pie_chart) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 24 }}>
                    {monthlyReport.charts.alarm_level_pie_chart && (
                      <div style={{ textAlign: 'center' }}>
                        <img 
                          src={monthlyReport.charts.alarm_level_pie_chart} 
                          alt="Alarm Level Distribution" 
                          style={{ maxWidth: '100%', height: 'auto', border: '1px solid #dee2e6', borderRadius: 4 }}
                        />
                      </div>
                    )}
                    {monthlyReport.charts.causes_pie_chart && (
                      <div style={{ textAlign: 'center' }}>
                        <img 
                          src={monthlyReport.charts.causes_pie_chart} 
                          alt="Fire Causes Distribution" 
                          style={{ maxWidth: '100%', height: 'auto', border: '1px solid #dee2e6', borderRadius: 4 }}
                        />
                      </div>
                    )}
                  </div>
                )}
                
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: 12, textAlign: 'left', border: '1px solid #dee2e6' }}>Cause</th>
                      <th style={{ padding: 12, textAlign: 'center', border: '1px solid #dee2e6' }}>Cases</th>
                      <th style={{ padding: 12, textAlign: 'center', border: '1px solid #dee2e6' }}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.common_causes.map((cause, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: 12, border: '1px solid #dee2e6' }}>{cause.cause}</td>
                        <td style={{ padding: 12, border: '1px solid #dee2e6', textAlign: 'center' }}>{cause.case_count}</td>
                        <td style={{ padding: 12, border: '1px solid #dee2e6', textAlign: 'center' }}>{cause.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {monthlyReport.common_causes.length > 0 && (
                  <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                    <strong>Most frequent cause:</strong> {monthlyReport.common_causes[0].cause} ({monthlyReport.common_causes[0].percentage}% of total incidents)
                  </p>
                )}
              </div>
            )}

            {/* Damage Summary */}
            <div style={{ marginBottom: 30 }}>
              <h4 style={{ color: '#007bff', marginBottom: 16 }}>💵 5. Estimated Damage Summary</h4>
              <div style={{ padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#28a745' }}>
                  Total estimated property loss for {monthlyReport.report_info.month_covered}:
                </div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#007bff' }}>
                  {formatCurrency(monthlyReport.damage_summary.total_damage)}
                </div>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: 12, textAlign: 'left', border: '1px solid #dee2e6' }}>Damage Range</th>
                    <th style={{ padding: 12, textAlign: 'center', border: '1px solid #dee2e6' }}>Number of Incidents</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReport.damage_summary.damage_ranges.map((range, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: 12, border: '1px solid #dee2e6' }}>{range.range}</td>
                      <td style={{ padding: 12, border: '1px solid #dee2e6', textAlign: 'center' }}>{range.incident_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Verification */}
            {monthlyReport.verification.length > 0 && (
              <div style={{ marginBottom: 30 }}>
                <h4 style={{ color: '#007bff', marginBottom: 16 }}>👥 6. Verification and Documentation</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: 12, textAlign: 'left', border: '1px solid #dee2e6' }}>Verified By</th>
                      <th style={{ padding: 12, textAlign: 'center', border: '1px solid #dee2e6' }}>Number of Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.verification.map((verifier, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: 12, border: '1px solid #dee2e6' }}>{verifier.reported_by}</td>
                        <td style={{ padding: 12, border: '1px solid #dee2e6', textAlign: 'center' }}>{verifier.report_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 30, padding: 20, textAlign: 'center', fontSize: 14, borderTop: '2px solid #007bff' }}>
              <p><strong>Prepared by:</strong></p>
              <p>(Automated Report Generated by Fire Safety Mapping System)</p>
              <p><strong>Bureau of Fire Protection – Mandaluyong City</strong></p>
              <p><strong>Date:</strong> {monthlyReport.report_info.report_generated}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
