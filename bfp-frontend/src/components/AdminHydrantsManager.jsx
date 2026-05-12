import React, { useEffect, useState } from 'react';
import Modal from './ui/Modal';
import ConfirmToast from './ui/ConfirmToast';
import MapPicker from './MapPicker';
import { formatCoord } from '../utils/formatters';
import { API_BASE_URL } from '../config';

function getToken() {
  return localStorage.getItem('token') || null;
}

export default function AdminHydrantsManager() {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newHydrant, setNewHydrant] = useState({});
  const [formErrors, setFormErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmToast, setConfirmToast] = useState(null);

  async function fetchRows() {
    setLoading(true); setError(null);
    try {
  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/hydrants/admin`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRows(data.rows || []);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchRows(); }, []);

  useEffect(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return setFilteredRows(rows);
    setFilteredRows(rows.filter(r => String(r.id).includes(q) || (r.address && r.address.toLowerCase().includes(q))));
  }, [query, rows]);

  function openEdit(r) {
    setEditing({ ...r });
  }
  function closeEdit() { setEditing(null); }

  function openAdd() {
    setNewHydrant({
      address: '',
      latitude: 14.5794,
      lng: 121.0359,
      type_color: '',
      barangay_id: '',
      is_operational: true,
      remarks: ''
    });
    setAdding(true);
  }
  function closeAdd() {
    setAdding(false);
    setNewHydrant({});
    setFieldErrors({});
    setFormErrors([]);
  }

  async function deleteHydrant(id) {
    if (!window.confirm('Are you sure you want to delete this hydrant?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/hydrants/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete hydrant');
      }
      // Remove from local state
      setRows(rs => rs.filter(r => r.id !== id));
      closeEdit();
      try { setConfirmToast('Hydrant deleted successfully!'); } catch(e) {}
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function validateEditing(ed) {
    const errs = {};
    if (!ed) return errs;
    if (!ed.address || String(ed.address).trim() === '') errs.address = 'Address is required.';
    // If latitude/longitude provided, validate numeric and ranges
    if (ed.latitude !== undefined && ed.latitude !== '' && ed.latitude !== null) {
      const lat = Number(ed.latitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) errs.latitude = 'Latitude must be a number between -90 and 90.';
    }
    if (ed.longitude !== undefined && ed.longitude !== '' && ed.longitude !== null) {
      const lng = Number(ed.longitude);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) errs.longitude = 'Longitude must be a number between -180 and 180.';
    }
    if (ed.barangay_id !== undefined && ed.barangay_id !== '' && ed.barangay_id !== null) {
      const bid = Number(ed.barangay_id);
      if (!Number.isInteger(bid) || bid < 0) errs.barangay_id = 'Barangay ID must be a non-negative integer.';
    }
    return errs;
  }

  async function submitAdd(e) {
    e.preventDefault();
    // Validate
    const errs = validateEditing(newHydrant);
    const keys = Object.keys(errs || {});
    if (keys.length) {
      setFieldErrors(errs);
      setFormErrors(['Please fix the highlighted fields.']);
      setTimeout(() => {
        const sel = document.querySelector('.modal-portal input[name="' + keys[0] + '"]') || document.querySelector('.modal-portal [name="' + keys[0] + '"]');
        sel?.focus?.();
      }, 40);
      return;
    }
    setFieldErrors({});

    const body = {
      address: newHydrant.address,
      latitude: Number(newHydrant.latitude),
      longitude: Number(newHydrant.longitude),
      type_color: newHydrant.type_color,
      barangay_id: newHydrant.barangay_id !== undefined && newHydrant.barangay_id !== '' ? Number(newHydrant.barangay_id) : undefined,
      is_operational: newHydrant.is_operational,
      remarks: newHydrant.remarks,
    };

    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/hydrants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create hydrant');
      // Add to local rows
      setRows(rs => [...rs, data.hydrant]);
      closeAdd();
      try { setConfirmToast('Hydrant created successfully!'); } catch(e) {}
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function submitEdit(e) {
    e.preventDefault();
    // Validate client-side first (return object of field errors)
    const errs = validateEditing(editing);
    const keys = Object.keys(errs || {});
    if (keys.length) {
      setFieldErrors(errs);
      setFormErrors(['Please fix the highlighted fields.']);
      // focus first invalid field in modal
      setTimeout(() => {
        const sel = document.querySelector('.modal-portal input[name="' + keys[0] + '"]') || document.querySelector('.modal-portal [name="' + keys[0] + '"]');
        sel?.focus?.();
      }, 40);
      return;
    }
    setFieldErrors({});

    // Build payload, coercing numeric fields. Note: backend may not have `location_desc` column.
    const body = {
      address: editing.address,
      latitude: editing.latitude !== undefined && editing.latitude !== '' ? Number(editing.latitude) : undefined,
      longitude: editing.longitude !== undefined && editing.longitude !== '' ? Number(editing.longitude) : undefined,
      type_color: editing.type_color,
      barangay_id: editing.barangay_id !== undefined && editing.barangay_id !== '' ? Number(editing.barangay_id) : undefined,
      is_operational: editing.is_operational,
      remarks: editing.remarks,
    };
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/hydrants/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      // update local rows
      setRows(rs => rs.map(r => (r.id === data.hydrant.id ? data.hydrant : r)));
      closeEdit();
  try { setConfirmToast('Hydrant saved.'); } catch(e) {}
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h2>Hydrants Manager</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}>
        <div style={{ display:'flex', gap:8, marginBottom: 8 }}>
          <input className="toolbar-search" placeholder="Search by ID or address" value={query} onChange={e=>setQuery(e.target.value)} />
          <button className="small-btn" onClick={()=>setQuery('')}>Reset</button>
          <button className="small-btn" style={{ marginLeft: 'auto', backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold' }} onClick={openAdd}>
            + Add New Hydrant
          </button>
        </div>
        <div className="table-responsive">
          <table className="admin-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>ID</th><th>Address</th><th className="col-hide-sm">Lat</th><th className="col-hide-sm">Lng</th><th className="col-hide-sm">Type</th><th className="col-hide-sm">Barangay</th><th>Status</th><th>Remarks</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(filteredRows || rows).map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td className="truncate" title={r.address}>{r.address}</td>
                <td className="col-hide-sm">{formatCoord(r.latitude)}</td>
                <td className="col-hide-sm">{formatCoord(r.longitude)}</td>
                <td className="col-hide-sm">{r.type_color}</td>
                <td className="col-hide-sm">{r.barangay_id}</td>
                <td>{r.is_operational ? 'Operational' : 'Not Operational'}</td>
                <td className="truncate" title={r.remarks}>{r.remarks}</td>
                <td><button className="small-btn" onClick={() => openEdit(r)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {adding && (
        <Modal open={true} onClose={closeAdd} title="Add New Hydrant">
          <form onSubmit={submitAdd}>
            <div style={{ display:'grid', gap:12 }}>
              <div className="form-row">
                <label>Address *</label>
                <input name="address" value={newHydrant.address||''} onChange={e=>setNewHydrant({...newHydrant,address:e.target.value})} />
                {fieldErrors.address && <div className="form-error">{fieldErrors.address}</div>}
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Location * (Click on map)</label>
                <MapPicker
                  value={{ lat: newHydrant.latitude || 14.5794, lng: newHydrant.longitude || 121.0359 }}
                  onChange={(pos, addr) => setNewHydrant({
                    ...newHydrant, 
                    latitude: pos.lat, 
                    longitude: pos.lng,
                    address: addr || newHydrant.address // Auto-fill address from reverse geocoding
                  })}
                />
              </div>

              <div className="form-row">
                <label>Type Color</label>
                <input name="type_color" value={newHydrant.type_color||''} onChange={e=>setNewHydrant({...newHydrant,type_color:e.target.value})} />
              </div>
              <div className="form-row">
                <label>Barangay ID</label>
                <input name="barangay_id" type="number" value={newHydrant.barangay_id||''} onChange={e=>setNewHydrant({...newHydrant,barangay_id:e.target.value})} />
                {fieldErrors.barangay_id && <div className="form-error">{fieldErrors.barangay_id}</div>}
              </div>
              <div className="form-row">
                <label>Status</label>
                <select value={newHydrant.is_operational? '1':'0'} onChange={e=>setNewHydrant({...newHydrant,is_operational: e.target.value === '1'})}>
                  <option value='1'>Operational</option>
                  <option value='0'>Not Operational</option>
                </select>
              </div>
              <div className="form-row">
                <label>Remarks</label>
                <textarea value={newHydrant.remarks||''} onChange={e=>setNewHydrant({...newHydrant,remarks:e.target.value})} />
              </div>
              <div className="form-actions">
                <button type='button' onClick={closeAdd} className="small-btn">Cancel</button>
                <button type='submit' className="small-btn" style={{ backgroundColor: '#4caf50', color: 'white' }}>Create Hydrant</button>
              </div>
              {formErrors && formErrors.length > 0 && (
                <div className="form-error">
                  <strong>Errors:</strong>
                  <ul>{formErrors.map((err,i)=><li key={i}>{err}</li>)}</ul>
                </div>
              )}
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal open={true} onClose={closeEdit} title={`Edit Hydrant #${editing.id}`}>
          <form onSubmit={submitEdit}>
            <div style={{ display:'grid', gap:8 }}>
              <div className="form-row"><label>Address</label><input name="address" value={editing.address||''} onChange={e=>setEditing({...editing,address:e.target.value})} />{fieldErrors.address && <div className="form-error">{fieldErrors.address}</div>}</div>
              <div className="form-row"><label>Latitude</label><input name="latitude" value={editing.latitude||''} onChange={e=>setEditing({...editing,latitude:e.target.value})} />{fieldErrors.latitude && <div className="form-error">{fieldErrors.latitude}</div>}</div>
              <div className="form-row"><label>Longitude</label><input name="longitude" value={editing.longitude||''} onChange={e=>setEditing({...editing,longitude:e.target.value})} />{fieldErrors.longitude && <div className="form-error">{fieldErrors.longitude}</div>}</div>
              <div className="form-row"><label>Type Color</label><input name="type_color" value={editing.type_color||''} onChange={e=>setEditing({...editing,type_color:e.target.value})} /></div>
              {/* location_desc removed: not all backends have this column */}
              <div className="form-row"><label>Barangay ID</label><input name="barangay_id" type="number" value={editing.barangay_id||''} onChange={e=>setEditing({...editing,barangay_id:e.target.value})} />{fieldErrors.barangay_id && <div className="form-error">{fieldErrors.barangay_id}</div>}</div>
              <div className="form-row"><label>Status</label><select value={editing.is_operational? '1':'0'} onChange={e=>setEditing({...editing,is_operational: e.target.value === '1'})}><option value='1'>Operational</option><option value='0'>Not Operational</option></select></div>
              <div className="form-row"><label>Remarks</label><textarea value={editing.remarks||''} onChange={e=>setEditing({...editing,remarks:e.target.value})} /></div>
              <div className="form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                {/* TEMPORARILY DISABLED */}
                {/* <button type='button' onClick={() => deleteHydrant(editing.id)} className="small-btn" style={{ backgroundColor: '#f44336', color: 'white' }}>Delete</button> */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type='button' onClick={closeEdit} className="small-btn">Cancel</button>
                  <button type='submit' className="small-btn">Save Changes</button>
                </div>
              </div>
              {formErrors && formErrors.length > 0 && (
                <div className="form-error">
                  <strong>Errors:</strong>
                  <ul>{formErrors.map((err,i)=><li key={i}>{err}</li>)}</ul>
                </div>
              )}
            </div>
          </form>
        </Modal>
      )}
      <ConfirmToast message={confirmToast} onClose={() => setConfirmToast(null)} duration={3000} />
    </div>
  );
}
