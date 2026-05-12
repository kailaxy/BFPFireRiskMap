import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './ui/Modal';

function getToken() { return localStorage.getItem('token') || null; }

function isAdmin() {
  try {
    const s = localStorage.getItem('user');
    if (!s) return false;
    const u = JSON.parse(s);
    return u && u.role === 'admin';
  } catch (err) { return false; }
}

export default function AdminHistoricalFires() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Update a historical fire record
  async function handleUpdate() {
    if (!editing) return;
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/incidentsReports/${editing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText || 'Update failed');
      }
      // Refresh list and close modal
      setEditing(null);
      setEditForm({});
      fetchRows();
    } catch (err) {
      console.error('Failed to update report', err);
      alert('Failed to update record: ' + (err.message || String(err)));
    }
  }

  // Delete a historical fire record by id
  async function handleDelete(id) {
    if (!confirm('Delete this historical fire record? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/incidentsReports/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || res.statusText || 'Delete failed');
      }
      // Refresh list
      fetchRows();
    } catch (err) {
      console.error('Failed to delete report', err);
      alert('Failed to delete record: ' + (err.message || String(err)));
    }
  }

  async function fetchRows() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));
  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/incidentsReports?` + params.toString(), { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load reports');
      setRows(data.rows || []);
      setTotal(Number.isFinite(data.total) ? data.total : (Array.isArray(data.rows) ? data.rows.length : 0));
    } catch (err) {
      setError(err.message || String(err));
    } finally { setLoading(false); }
  }

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
    <div className="historical-fires-page">
      <style>{`
        .admin-content-inner {
          overflow: visible !important;
        }
        .historical-fires-page {
          padding: 1rem;
          overflow: visible !important;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .historical-fires-table-wrapper {
          overflow-x: auto;
          overflow-y: auto;
          max-height: calc(100vh - 280px);
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          margin-bottom: 2rem;
          max-width: 100%;
        }
        .historical-fires-table {
          width: 100% !important;
          min-width: auto !important;
          table-layout: fixed;
          font-size: 12px;
        }
        .historical-fires-table th,
        .historical-fires-table td {
          padding: 6px 8px !important;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .historical-fires-table th {
          font-size: 11px;
          font-weight: 600;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
          box-shadow: 0 2px 2px rgba(0,0,0,0.05);
        }
        /* Column widths */
        .historical-fires-table th:nth-child(1), .historical-fires-table td:nth-child(1) { width: 10%; } /* Barangay */
        .historical-fires-table th:nth-child(2), .historical-fires-table td:nth-child(2) { width: 12%; } /* Address */
        .historical-fires-table th:nth-child(3), .historical-fires-table td:nth-child(3) { width: 6%; } /* Alarm */
        .historical-fires-table th:nth-child(4), .historical-fires-table td:nth-child(4) { width: 10%; } /* Reported */
        .historical-fires-table th:nth-child(5), .historical-fires-table td:nth-child(5) { width: 10%; } /* Resolved */
        .historical-fires-table th:nth-child(6), .historical-fires-table td:nth-child(6) { width: 6%; } /* Duration */
        .historical-fires-table th:nth-child(7), .historical-fires-table td:nth-child(7) { width: 5%; } /* Casualties */
        .historical-fires-table th:nth-child(8), .historical-fires-table td:nth-child(8) { width: 5%; } /* Injuries */
        .historical-fires-table th:nth-child(9), .historical-fires-table td:nth-child(9) { width: 8%; } /* Damage */
        .historical-fires-table th:nth-child(10), .historical-fires-table td:nth-child(10) { width: 10%; } /* Cause */
        .historical-fires-table th:nth-child(11), .historical-fires-table td:nth-child(11) { width: 8%; } /* Actions Taken */
        .historical-fires-table th:nth-child(12), .historical-fires-table td:nth-child(12) { width: 8%; } /* Reported By */
        .historical-fires-table th:nth-child(13), .historical-fires-table td:nth-child(13) { width: 8%; } /* Verified By */
        .historical-fires-table th:nth-child(14), .historical-fires-table td:nth-child(14) { width: 10%; } /* Actions */
        .historical-fires-table-wrapper::-webkit-scrollbar {
          height: 8px;
        }
        .historical-fires-table-wrapper::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .historical-fires-table-wrapper::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        .historical-fires-table-wrapper::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .historical-fires-table .small-btn {
          font-size: 10px;
          padding: 3px 6px;
        }
      `}</style>
      
      <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', marginBottom: '1rem' }}>Historical Fires</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ display:'flex', gap:8, marginTop:12, marginBottom:8, flexWrap: 'wrap' }}>
        <input className="toolbar-search" placeholder="Search address or reporter" value={query} onChange={e=>setQuery(e.target.value)} style={{ minWidth: '200px', flex: '1 1 auto' }} />
        <button className="small-btn" onClick={()=>{ setQuery(''); setPage(0); }}>Reset</button>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <label style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }}>Per page:</label>
          <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value,10)); setPage(0); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="historical-fires-table-wrapper">
        <table className="admin-table historical-fires-table">
          <thead>
            <tr>
              <th title="Barangay">Barangay</th>
              <th title="Address">Address</th>
              <th title="Alarm Level">Alarm</th>
              <th title="Reported At">Reported</th>
              <th title="Resolved At">Resolved</th>
              <th title="Duration (minutes)">Dur.</th>
              <th title="Casualties">Cas.</th>
              <th title="Injuries">Inj.</th>
              <th title="Estimated Damage">Damage</th>
              <th title="Cause">Cause</th>
              <th title="Actions Taken">Actions</th>
              <th title="Reported By">Reporter</th>
              <th title="Verified By">Verifier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={14} style={{ textAlign:'center', padding:20 }}>{loading ? 'Loading...' : 'No records'}</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td title={r.barangay}>{r.barangay}</td>
                <td title={r.address}>{(r.address || '').split(',')[0]}</td>
                <td>{r.alarm_level}</td>
                <td title={r.reported_at ? new Date(r.reported_at).toLocaleString() : ''}>
                  {r.reported_at ? new Date(r.reported_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : ''}
                </td>
                <td title={r.resolved_at ? new Date(r.resolved_at).toLocaleString() : ''}>
                  {r.resolved_at ? new Date(r.resolved_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : ''}
                </td>
                <td>{r.duration_minutes ?? ''}</td>
                <td>{r.casualties ?? ''}</td>
                <td>{r.injuries ?? ''}</td>
                <td title={r.estimated_damage}>{r.estimated_damage ?? ''}</td>
                <td title={r.cause}>{r.cause ?? ''}</td>
                <td title={r.actions_taken}>{r.actions_taken ?? ''}</td>
                <td title={r.reported_by}>{r.reported_by}</td>
                <td title={r.verified_by}>{r.verified_by ?? ''}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    <button className="small-btn" onClick={()=>setSelected(r)}>View</button>
                    <button className="small-btn" onClick={() => { setEditing(r); setEditForm(r); }}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingBottom: '2rem' }}>
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
        <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Report #${selected.id} — ${selected.barangay || ''}`}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
            <div style={{ display:'grid', gridTemplateColumns: '1fr', gap:12 }}>
              <div><strong>Address:</strong> {selected.address}</div>
              <div><strong>Barangay:</strong> {selected.barangay}</div>
              <div><strong>Alarm Level:</strong> {selected.alarm_level}</div>
              <div><strong>Reported At:</strong> {selected.reported_at ? new Date(selected.reported_at).toLocaleString() : ''}</div>
              <div><strong>Reported By:</strong> {selected.reported_by}</div>
              <div><strong>Resolved At:</strong> {selected.resolved_at ? new Date(selected.resolved_at).toLocaleString() : ''}</div>
              <div><strong>Duration (minutes):</strong> {selected.duration_minutes ?? 'N/A'}</div>
              <div><strong>Casualties:</strong> {selected.casualties ?? 'N/A'}</div>
              <div><strong>Injuries:</strong> {selected.injuries ?? 'N/A'}</div>
              <div><strong>Estimated Damage:</strong> {selected.estimated_damage ?? 'N/A'}</div>
              <div><strong>Cause:</strong> {selected.cause ?? 'N/A'}</div>
              <div><strong>Actions Taken:</strong> {selected.actions_taken ?? 'N/A'}</div>
              <div><strong>Verified By:</strong> {selected.verified_by ?? 'N/A'}</div>
              <div><strong>Attachments:</strong> {Array.isArray(selected.attachments) ? selected.attachments.join(', ') : (selected.attachments || 'None')}</div>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal open={!!editing} onClose={()=>{ setEditing(null); setEditForm({}); }} title={`Edit Report #${editing.id}`}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
            <div style={{ display:'grid', gridTemplateColumns: '1fr', gap:12 }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Address</label>
                <input type="text" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Barangay</label>
                <input type="text" value={editForm.barangay || ''} onChange={e => setEditForm({...editForm, barangay: e.target.value})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Alarm Level</label>
                <input type="text" value={editForm.alarm_level || ''} onChange={e => setEditForm({...editForm, alarm_level: e.target.value})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Latitude</label>
                <input type="number" step="any" value={editForm.lat ?? ''} onChange={e => setEditForm({...editForm, lat: parseFloat(e.target.value) || null})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Longitude</label>
                <input type="number" step="any" value={editForm.lng ?? ''} onChange={e => setEditForm({...editForm, lng: parseFloat(e.target.value) || null})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Reported At</label>
                <input type="datetime-local" value={editForm.reported_at ? new Date(editForm.reported_at).toISOString().slice(0, 16) : ''} onChange={e => setEditForm({...editForm, reported_at: e.target.value})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Resolved At</label>
                <input type="datetime-local" value={editForm.resolved_at ? new Date(editForm.resolved_at).toISOString().slice(0, 16) : ''} onChange={e => setEditForm({...editForm, resolved_at: e.target.value})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Duration (minutes)</label>
                <input type="number" value={editForm.duration_minutes ?? ''} onChange={e => setEditForm({...editForm, duration_minutes: parseInt(e.target.value, 10) || null})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Casualties</label>
                <input type="number" value={editForm.casualties ?? ''} onChange={e => setEditForm({...editForm, casualties: parseInt(e.target.value, 10) || null})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Injuries</label>
                <input type="number" value={editForm.injuries ?? ''} onChange={e => setEditForm({...editForm, injuries: parseInt(e.target.value, 10) || null})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Estimated Damage</label>
                <input type="text" value={editForm.estimated_damage ?? ''} onChange={e => setEditForm({...editForm, estimated_damage: e.target.value})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Cause</label>
                <textarea value={editForm.cause || ''} onChange={e => setEditForm({...editForm, cause: e.target.value})} style={{ width: '100%', padding: 8, minHeight: 60 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Actions Taken</label>
                <textarea value={editForm.actions_taken || ''} onChange={e => setEditForm({...editForm, actions_taken: e.target.value})} style={{ width: '100%', padding: 8, minHeight: 60 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Reported By</label>
                <input type="text" value={editForm.reported_by || ''} onChange={e => setEditForm({...editForm, reported_by: e.target.value})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Verified By</label>
                <input type="text" value={editForm.verified_by || ''} onChange={e => setEditForm({...editForm, verified_by: e.target.value})} style={{ width: '100%', padding: 8 }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button className="small-btn" style={{ flex: 1, padding: 12, backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold' }} onClick={handleUpdate}>
                  Save Changes
                </button>
                <button className="small-btn" style={{ flex: 1, padding: 12 }} onClick={() => { setEditing(null); setEditForm({}); }}>
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
