import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

function getToken() { return localStorage.getItem('token') || null; }

function isAdmin() {
  try {
    const s = localStorage.getItem('user');
    if (!s) return false;
    const u = JSON.parse(s);
    return u && u.role === 'admin';
  } catch (err) { return false; }
}

export default function AdminReportsManager() {
  // Repurposed as Admin Barangays Manager
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchRows() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/barangays/admin`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRows(data.rows || []);
      setFiltered(data.rows || []);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchRows(); }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    setFiltered(rows.filter(r => !q || String(r.id).includes(q) || (r.name && r.name.toLowerCase().includes(q))));
  }, [query, rows]);

  if (!isAdmin()) return (
    <div style={{ padding: 20 }}>
      <h2>Access denied</h2>
      <p>You must be an admin to view this page.</p>
    </div>
  );

  function openEdit(r) { setEditing({ ...r }); }
  function closeEdit() { setEditing(null); }

  async function onSaveEdit(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/barangays/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: editing.name,
          population: editing.population,
          population_date: editing.population_date,
          brief_history: editing.brief_history,
          economic_profile: editing.economic_profile,
          osm_relation_id: editing.osm_relation_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setRows(rs => rs.map(r => (r.id === data.barangay.id ? data.barangay : r)));
      closeEdit();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm('Delete this barangay?')) return;
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/barangays/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setRows(rs => rs.filter(r => r.id !== id));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h2>Barangays Manager</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <input placeholder="Search by ID or Name" value={query} onChange={e=>setQuery(e.target.value)} />
        <button onClick={()=>{ setQuery(''); }}>Reset</button>
      </div>
      <div className="table-responsive">
        <table className="admin-table" style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr><th>ID</th><th>Name</th><th>Population</th><th>Population Date</th><th>Brief History</th><th>Economic Profile</th><th>Action</th></tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign:'center', padding:20 }}>No records</td></tr> : filtered.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.name}</td>
              <td>{r.population}</td>
              <td>{r.population_date}</td>
              <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.brief_history}</td>
              <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.economic_profile}</td>
              <td>
                <button onClick={()=>openEdit(r)}>Edit</button>
                {/* TEMPORARILY DISABLED */}{/* <button onClick={() =>onDelete(r.id)} style={{ marginLeft: 8, color: 'red' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>

      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'grid', placeItems:'center' }}>
          <div style={{ background:'#fff', padding:20, borderRadius:12, width:'90%', maxWidth:720 }}>
            <h3>Edit Barangay #{editing.id}</h3>
            <form onSubmit={onSaveEdit}>
              <div style={{ display:'grid', gap:8 }}>
                <label>Name<input value={editing.name||''} onChange={e=>setEditing({...editing,name:e.target.value})} /></label>
                <label>Population<input value={editing.population||''} onChange={e=>setEditing({...editing,population:e.target.value})} /></label>
                <label>Population Date<input value={editing.population_date||''} onChange={e=>setEditing({...editing,population_date:e.target.value})} /></label>
                <label>Brief History<textarea value={editing.brief_history||''} onChange={e=>setEditing({...editing,brief_history:e.target.value})} /></label>
                <label>Economic Profile<textarea value={editing.economic_profile||''} onChange={e=>setEditing({...editing,economic_profile:e.target.value})} /></label>
                <label>OSM Relation ID<input value={editing.osm_relation_id||''} onChange={e=>setEditing({...editing,osm_relation_id:e.target.value})} /></label>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                  <button type='button' onClick={closeEdit}>Cancel</button>
                  <button type='submit'>Save Changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

function getToken() { return localStorage.getItem('token') || null; }

function isAdmin() {
  try {
    const s = localStorage.getItem('user');
    if (!s) return false;
    const u = JSON.parse(s);
    return u && u.role === 'admin';
  } catch (err) { return false; }
}

export default function AdminReportsManager() {
  // Repurposed as Admin Barangays Manager
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchRows() {
    setLoading(true); setError(null);
    try {
  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/barangays/admin`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRows(data.rows || []);
      setFiltered(data.rows || []);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchRows(); }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    setFiltered(rows.filter(r => !q || String(r.id).includes(q) || (r.name && r.name.toLowerCase().includes(q))));
  }, [query, rows]);

  if (!isAdmin()) return (
    <div style={{ padding: 20 }}>
      <h2>Access denied</h2>
      <p>You must be an admin to view this page.</p>
    </div>
  );

  function openEdit(r) { setEditing({ ...r }); }
  function closeEdit() { setEditing(null); }

  async function onSaveEdit(e) {
    e.preventDefault();
    try {
  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/barangays/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: editing.name,
          population: editing.population,
          population_date: editing.population_date,
          brief_history: editing.brief_history,
          economic_profile: editing.economic_profile,
          osm_relation_id: editing.osm_relation_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setRows(rs => rs.map(r => (r.id === data.barangay.id ? data.barangay : r)));
      closeEdit();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm('Delete this barangay?')) return;
    try {
  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/barangays/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setRows(rs => rs.filter(r => r.id !== id));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h2>Barangays Manager</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <input placeholder="Search by ID or Name" value={query} onChange={e=>setQuery(e.target.value)} />
        <button onClick={()=>{ setQuery(''); }}>Reset</button>
      </div>
      <div className="table-responsive">
        <table className="admin-table" style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr><th>ID</th><th>Name</th><th>Population</th><th>Population Date</th><th>Brief History</th><th>Economic Profile</th><th>Action</th></tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign:'center', padding:20 }}>No records</td></tr> : filtered.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.name}</td>
              <td>{r.population}</td>
              <td>{r.population_date}</td>
              <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.brief_history}</td>
              <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.economic_profile}</td>
              <td>
                <button onClick={()=>openEdit(r)}>Edit</button>
                {/* TEMPORARILY DISABLED */}{/* <button onClick={() =>onDelete(r.id)} style={{ marginLeft: 8, color: 'red' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>

      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'grid', placeItems:'center' }}>
          <div style={{ background:'#fff', padding:20, borderRadius:12, width:'90%', maxWidth:720 }}>
            <h3>Edit Barangay #{editing.id}</h3>
            <form onSubmit={onSaveEdit}>
              <div style={{ display:'grid', gap:8 }}>
                <label>Name<input value={editing.name||''} onChange={e=>setEditing({...editing,name:e.target.value})} /></label>
                <label>Population<input value={editing.population||''} onChange={e=>setEditing({...editing,population:e.target.value})} /></label>
                <label>Population Date<input value={editing.population_date||''} onChange={e=>setEditing({...editing,population_date:e.target.value})} /></label>
                <label>Brief History<textarea value={editing.brief_history||''} onChange={e=>setEditing({...editing,brief_history:e.target.value})} /></label>
                <label>Economic Profile<textarea value={editing.economic_profile||''} onChange={e=>setEditing({...editing,economic_profile:e.target.value})} /></label>
                <label>OSM Relation ID<input value={editing.osm_relation_id||''} onChange={e=>setEditing({...editing,osm_relation_id:e.target.value})} /></label>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                  <button type='button' onClick={closeEdit}>Cancel</button>
                  <button type='submit'>Save Changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

