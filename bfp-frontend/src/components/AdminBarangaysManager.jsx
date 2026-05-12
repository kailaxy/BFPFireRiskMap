import React, { useEffect, useState } from 'react';
import Modal from './ui/Modal';
import ConfirmToast from './ui/ConfirmToast';
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

export default function AdminBarangaysManager() {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmToast, setConfirmToast] = useState(null);

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

  function validateEditing(ed) {
    const errs = {};
    if (!ed) return errs;
    if (!ed.name || String(ed.name).trim() === '') errs.name = 'Name is required.';
    if (ed.population !== undefined && ed.population !== '' && ed.population !== null) {
      const p = Number(ed.population);
      if (!Number.isInteger(p) || p < 0) errs.population = 'Population must be a non-negative integer.';
    }
    if (ed.osm_relation_id !== undefined && ed.osm_relation_id !== '' && ed.osm_relation_id !== null) {
      const o = Number(ed.osm_relation_id);
      if (!Number.isInteger(o) || o < 0) errs.osm_relation_id = 'OSM Relation ID must be a non-negative integer.';
    }
    return errs;
  }

  async function onSaveEdit(e) {
    e.preventDefault();
    const errs = validateEditing(editing);
    const keys = Object.keys(errs || {});
    if (keys.length) {
      setFieldErrors(errs);
      setFormErrors(['Please fix the highlighted fields.']);
      setTimeout(() => {
        const sel = document.querySelector('.modal-portal [name="' + keys[0] + '"]');
        sel?.focus?.();
      }, 40);
      return;
    }
    setFieldErrors({});
    try {
  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/barangays/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: editing.name,
          population: editing.population !== undefined && editing.population !== '' ? Number(editing.population) : undefined,
          population_date: editing.population_date,
          brief_history: editing.brief_history,
          economic_profile: editing.economic_profile,
          osm_relation_id: editing.osm_relation_id !== undefined && editing.osm_relation_id !== '' ? Number(editing.osm_relation_id) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setRows(rs => rs.map(r => (r.id === data.barangay.id ? data.barangay : r)));
      closeEdit();
  try { setConfirmToast('Barangay saved.'); } catch(e) {}
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
  try { setConfirmToast('Barangay deleted.'); } catch(e) {}
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
    <table className="admin-table" style={{ width:'100%' }}>
        <thead>
          <tr><th>ID</th><th>Name</th><th className="col-hide-sm">Population</th><th className="col-hide-sm">Population Date</th><th>Brief History</th><th className="col-hide-sm">Economic Profile</th><th>Action</th></tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign:'center', padding:20 }}>No records</td></tr> : filtered.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td className="truncate" title={r.name}>{r.name}</td>
              <td className="col-hide-sm">{r.population}</td>
              <td className="col-hide-sm">{r.population_date}</td>
              <td className="truncate" title={r.brief_history}>{r.brief_history}</td>
              <td className="col-hide-sm truncate" title={r.economic_profile}>{r.economic_profile}</td>
              <td>
                <button className="small-btn" onClick={()=>openEdit(r)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
    </table>
  </div>

      {editing && (
        <Modal open={true} onClose={closeEdit} title={`Edit Barangay #${editing.id}`}>
            <form onSubmit={onSaveEdit}>
              <div style={{ display:'grid', gap:8 }}>
                <div className="form-row"><label>Name</label><input name="name" value={editing.name||''} onChange={e=>setEditing({...editing,name:e.target.value})} />{fieldErrors.name && <div className="form-error">{fieldErrors.name}</div>}</div>
                <div className="form-row"><label>Population</label><input name="population" value={editing.population||''} onChange={e=>setEditing({...editing,population:e.target.value})} />{fieldErrors.population && <div className="form-error">{fieldErrors.population}</div>}</div>
                <div className="form-row"><label>Population Date</label><input name="population_date" value={editing.population_date||''} onChange={e=>setEditing({...editing,population_date:e.target.value})} /></div>
                <div className="form-row"><label>Brief History</label><textarea name="brief_history" value={editing.brief_history||''} onChange={e=>setEditing({...editing,brief_history:e.target.value})} /></div>
                <div className="form-row"><label>Economic Profile</label><textarea name="economic_profile" value={editing.economic_profile||''} onChange={e=>setEditing({...editing,economic_profile:e.target.value})} /></div>
                <div className="form-row"><label>OSM Relation ID</label><input name="osm_relation_id" value={editing.osm_relation_id||''} onChange={e=>setEditing({...editing,osm_relation_id:e.target.value})} />{fieldErrors.osm_relation_id && <div className="form-error">{fieldErrors.osm_relation_id}</div>}</div>
                <div className="form-actions">
                  <button type='button' onClick={closeEdit} className="small-btn">Cancel</button>
                  <button type='submit' className="small-btn">Save Changes</button>
                </div>
              </div>
            </form>
        </Modal>
      )}
      <ConfirmToast message={confirmToast} onClose={() => setConfirmToast(null)} duration={3000} />
    </div>
  );
}

// ConfirmToast render is included below
