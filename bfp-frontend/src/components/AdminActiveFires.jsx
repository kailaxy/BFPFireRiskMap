import React, { useEffect, useState, useContext } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE_URL } from '../config';
import { MapContext } from '../logic.jsx';
import Modal from './ui/Modal';
import ActiveFireResolveModal from './ActiveFireResolveModal';

function getToken() { return localStorage.getItem('token') || null; }

function isAdmin() {
  try {
    const s = localStorage.getItem('user');
    if (!s) return false;
    const u = JSON.parse(s);
    return u && u.role === 'admin';
  } catch (err) { return false; }
}

function canManageFires() {
  try {
    const s = localStorage.getItem('user');
    if (!s) {
      console.log('[canManageFires] No user in localStorage');
      return false;
    }
    const u = JSON.parse(s);
    console.log('[canManageFires] User:', u);
    const canManage = u && (u.role === 'admin' || u.role === 'responder');
    console.log('[canManageFires] Can manage fires:', canManage);
    return canManage;
  } catch (err) { 
    console.error('[canManageFires] Error:', err);
    return false; 
  }
}

export default function AdminActiveFires() {
  const { resolveFire } = useContext(MapContext);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [fireToResolve, setFireToResolve] = useState(null);

  async function fetchRows() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/active_fires`, { 
        headers: { Authorization: `Bearer ${getToken()}` } 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load active fires');
      
      // Convert GeoJSON features to table rows
      const features = data.features || [];
      let filteredRows = features.map(f => ({
        id: f.properties.id,
        address: f.properties.address,
        barangay: f.properties.barangay,
        alarm_level: f.properties.alarm_level,
        reported_by: f.properties.reported_by,
        reported_at: f.properties.reported_at,
        lat: f.properties.lat,
        lng: f.properties.lng,
        _feature: f // Store full feature for resolve modal
      }));

      // Apply client-side filtering if query exists
      if (query.trim()) {
        const q = query.toLowerCase();
        filteredRows = filteredRows.filter(r => 
          (r.address || '').toLowerCase().includes(q) ||
          (r.barangay || '').toLowerCase().includes(q) ||
          (r.reported_by || '').toLowerCase().includes(q)
        );
      }

      // Apply pagination
      const startIndex = page * limit;
      const endIndex = startIndex + limit;
      const paginatedRows = filteredRows.slice(startIndex, endIndex);

      setRows(paginatedRows);
      setTotal(filteredRows.length);
    } catch (err) {
      setError(err.message || String(err));
    } finally { setLoading(false); }
  }

  const handleResolveClick = (row) => {
    setFireToResolve(row._feature);
    setResolveModalOpen(true);
  };

  const handleFalseAlarmClick = async (row) => {
    if (!window.confirm(`Mark this fire report as a false alarm?\n\nThis will move it to historical records with alarm level "False Alarm" and exclude it from forecasting calculations.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/active_fires/${row.id}/false-alarm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          verified_by: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).name : 'Admin',
          actions_taken: 'Marked as false alarm'
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark as false alarm');
      }

      alert('Fire report marked as false alarm successfully');
      
      // Refresh the data
      fetchRows();
      
      // Update map if resolveFire exists
      if (resolveFire) {
        resolveFire(row.id);
      }
    } catch (err) {
      console.error('Error marking as false alarm:', err);
      alert('Failed to mark as false alarm: ' + err.message);
    }
  };

  const handleResolveClose = () => {
    setFireToResolve(null);
    setResolveModalOpen(false);
    // Refresh the data after resolving
    fetchRows();
  };

  useEffect(() => { fetchRows(); }, [page, limit]);

  useEffect(() => {
    // debounce search -> reset to page 0
    const t = setTimeout(() => { setPage(0); fetchRows(); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (!isAdmin()) return (
    <div style={{ padding: 20 }}>
      <h2>Access denied</h2>
      <p>You must be an admin to view this page.</p>
    </div>
  );

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h2>Active Fires</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ display:'flex', gap:8, marginTop:12, marginBottom:8 }}>
        <input className="toolbar-search" placeholder="Search address, barangay, or reporter" value={query} onChange={e=>setQuery(e.target.value)} />
        <button className="small-btn" onClick={()=>{ setQuery(''); setPage(0); }}>Reset</button>
        <div style={{ marginLeft: 'auto', display:'flex', gap:8, alignItems:'center' }}>
          <label style={{ fontSize:13 }}>Per page:</label>
          <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value,10)); setPage(0); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="admin-table" style={{ width: '100%', minWidth: 800 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Barangay</th>
              <th>Address</th>
              <th className="col-hide-sm">Alarm Level</th>
              <th className="col-hide-sm">Reported At</th>
              <th className="col-hide-sm">Reported By</th>
              <th className="col-hide-md">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:20 }}>{loading ? 'Loading...' : 'No active fires'}</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td className="truncate" title={r.barangay}>{r.barangay}</td>
                <td className="truncate" title={r.address}>{(r.address || '').split(',')[0]}</td>
                <td className="col-hide-sm">
                  <span className={`status-badge ${r.alarm_level?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {r.alarm_level}
                  </span>
                </td>
                <td className="col-hide-sm">{r.reported_at ? new Date(r.reported_at).toLocaleString() : ''}</td>
                <td className="col-hide-sm">{r.reported_by}</td>
                <td className="col-hide-md">
                  <button className="small-btn" onClick={()=>setSelected(r)}>View</button>
                  {canManageFires() && (
                    <>
                      <button className="small-btn" onClick={(e)=>{e.stopPropagation(); handleResolveClick(r);}} style={{marginLeft: 4, backgroundColor: '#28a745', color: 'white'}}>Resolve Fire</button>
                      <button className="small-btn" onClick={(e)=>{e.stopPropagation(); handleFalseAlarmClick(r);}} style={{marginLeft: 4, backgroundColor: '#ffc107', color: '#000'}}>False Alarm</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
        <div>
          Showing {Math.min(page*limit+1, total || 0)} - {Math.min((page+1)*limit, total || rows.length)} of {total || rows.length}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="small-btn" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>Prev</button>
          <span style={{ alignSelf:'center' }}>Page {page+1}</span>
          <button className="small-btn" onClick={()=>setPage(p=>p+1)} disabled={(page+1)*limit >= (total || rows.length)}>Next</button>
        </div>
      </div>

      {selected && (
        <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Active Fire #${selected.id} — ${selected.barangay || ''}`}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
            <div style={{ display:'grid', gridTemplateColumns: '1fr', gap:12 }}>
              <div><strong>ID:</strong> {selected.id}</div>
              <div><strong>Address:</strong> {selected.address}</div>
              <div><strong>Barangay:</strong> {selected.barangay}</div>
              <div><strong>Alarm Level:</strong> {selected.alarm_level}</div>
              <div><strong>Reported At:</strong> {selected.reported_at ? new Date(selected.reported_at).toLocaleString() : ''}</div>
              <div><strong>Reported By:</strong> {selected.reported_by}</div>
              <div><strong>Coordinates:</strong> {selected.lat}, {selected.lng}</div>
            </div>
          </div>
        </Modal>
      )}
      
      {resolveModalOpen && fireToResolve &&
        ReactDOM.createPortal(
          <ActiveFireResolveModal
            fire={fireToResolve}
            onClose={handleResolveClose}
          />,
          document.body
        )
      }
    </div>
  );
}