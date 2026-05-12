import React, { useEffect, useState, useContext } from 'react';
import Modal from './ui/Modal';
import ConfirmToast from './ui/ConfirmToast';
import MapPicker from './MapPicker';
import { formatCoord } from '../utils/formatters';
import { API_BASE_URL } from '../config';
import { MapContext } from '../logic';

function getToken() {
  return localStorage.getItem('token') || null;
}

export default function AdminFireStationsManager() {
  const { refetchFireStations } = useContext(MapContext); // Get refetch function from context
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newStation, setNewStation] = useState({});
  const [formErrors, setFormErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmToast, setConfirmToast] = useState(null);

  async function fetchRows() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/firestation/admin`, { headers: { Authorization: `Bearer ${getToken()}` } });
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
    setFilteredRows(rows.filter(r => 
      String(r.id).includes(q) || 
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.address && r.address.toLowerCase().includes(q))
    ));
  }, [query, rows]);

  function openEdit(r) {
    setEditing({ ...r });
  }
  function closeEdit() { setEditing(null); setFieldErrors({}); setFormErrors([]); }

  function openAdd() {
    setNewStation({
      name: '',
      operator: '',
      address: '',
      contact_phone: '',
      latitude: 14.5794,
      longitude: 121.0359,
    });
    setAdding(true);
  }
  function closeAdd() {
    setAdding(false);
    setNewStation({});
    setFieldErrors({});
    setFormErrors([]);
  }

  async function deleteFireStation(id) {
    if (!window.confirm('Are you sure you want to delete this fire station?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/firestation/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete fire station');
      }
      // Remove from local state
      setRows(rs => rs.filter(r => r.id !== id));
      closeEdit();
      // Refetch fire stations in MapContext so deleted station is removed from map
      if (refetchFireStations) {
        refetchFireStations();
      }
      try { setConfirmToast('Fire station deleted successfully!'); } catch(e) {}
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function validateStation(station) {
    const errs = {};
    if (!station) return errs;
    if (!station.name || String(station.name).trim() === '') errs.name = 'Name is required.';
    if (station.latitude !== undefined && station.latitude !== '' && station.latitude !== null) {
      const lat = Number(station.latitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) errs.latitude = 'Latitude must be a number between -90 and 90.';
    }
    if (station.longitude !== undefined && station.longitude !== '' && station.longitude !== null) {
      const lng = Number(station.longitude);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) errs.longitude = 'Longitude must be a number between -180 and 180.';
    }
    return errs;
  }

  async function submitAdd(e) {
    e.preventDefault();
    const errs = validateStation(newStation);
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
      name: newStation.name,
      operator: newStation.operator,
      address: newStation.address,
      contact_phone: newStation.contact_phone,
      latitude: Number(newStation.latitude),
      longitude: Number(newStation.longitude),
    };

    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/firestation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create fire station');
      setRows(rs => [...rs, data.station]);
      closeAdd();
      // Refetch fire stations in MapContext so new station appears on map
      if (refetchFireStations) {
        refetchFireStations();
      }
      try { setConfirmToast('Fire station created successfully!'); } catch(e) {}
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function submitEdit(e) {
    e.preventDefault();
    const errs = validateStation(editing);
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
      name: editing.name,
      operator: editing.operator,
      address: editing.address,
      contact_phone: editing.contact_phone,
      latitude: editing.latitude !== undefined && editing.latitude !== '' ? Number(editing.latitude) : undefined,
      longitude: editing.longitude !== undefined && editing.longitude !== '' ? Number(editing.longitude) : undefined,
    };

    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/firestation/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setRows(rs => rs.map(r => (r.id === data.station.id ? data.station : r)));
      closeEdit();
      // Refetch fire stations in MapContext so edited station updates on map
      if (refetchFireStations) {
        refetchFireStations();
      }
      try { setConfirmToast('Fire station saved.'); } catch(e) {}
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h2>Fire Stations Manager</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}>
        <div style={{ display:'flex', gap:8, marginBottom: 8 }}>
          <input className="toolbar-search" placeholder="Search by name or address" value={query} onChange={e=>setQuery(e.target.value)} />
          <button className="small-btn" onClick={()=>setQuery('')}>Reset</button>
          <button className="small-btn" style={{ marginLeft: 'auto', backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold' }} onClick={openAdd}>
            + Add New Fire Station
          </button>
        </div>
        <div className="table-responsive">
          <table className="admin-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th className="col-hide-sm">Operator</th>
              <th>Address</th>
              <th className="col-hide-sm">Contact Phone</th>
              <th className="col-hide-sm">Lat</th>
              <th className="col-hide-sm">Lng</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(filteredRows || rows).map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td className="truncate" title={r.name}>{r.name}</td>
                <td className="col-hide-sm truncate" title={r.operator}>{r.operator}</td>
                <td className="truncate" title={r.address}>{r.address}</td>
                <td className="col-hide-sm">{r.contact_phone}</td>
                <td className="col-hide-sm">{formatCoord(r.latitude)}</td>
                <td className="col-hide-sm">{formatCoord(r.longitude)}</td>
                <td><button className="small-btn" onClick={() => openEdit(r)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {adding && (
        <Modal open={true} onClose={closeAdd} title="Add New Fire Station">
          <form onSubmit={submitAdd}>
            <div style={{ display:'grid', gap:12 }}>
              <div className="form-row">
                <label>Name *</label>
                <input name="name" value={newStation.name||''} onChange={e=>setNewStation({...newStation,name:e.target.value})} />
                {fieldErrors.name && <div className="form-error">{fieldErrors.name}</div>}
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Location * (Click on map)</label>
                <MapPicker
                  value={{ lat: newStation.latitude || 14.5794, lng: newStation.longitude || 121.0359 }}
                  onChange={(pos, addr) => setNewStation({
                    ...newStation, 
                    latitude: pos.lat, 
                    longitude: pos.lng,
                    address: addr || newStation.address // Auto-fill address from reverse geocoding
                  })}
                />
              </div>

              <div className="form-row">
                <label>Operator</label>
                <input name="operator" value={newStation.operator||''} onChange={e=>setNewStation({...newStation,operator:e.target.value})} />
              </div>
              <div className="form-row">
                <label>Address</label>
                <input name="address" value={newStation.address||''} onChange={e=>setNewStation({...newStation,address:e.target.value})} />
              </div>
              <div className="form-row">
                <label>Contact Phone</label>
                <input name="contact_phone" value={newStation.contact_phone||''} onChange={e=>setNewStation({...newStation,contact_phone:e.target.value})} />
              </div>
              <div className="form-actions">
                <button type='button' onClick={closeAdd} className="small-btn">Cancel</button>
                <button type='submit' className="small-btn" style={{ backgroundColor: '#4caf50', color: 'white' }}>Create Station</button>
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
        <Modal open={true} onClose={closeEdit} title={`Edit Fire Station #${editing.id}`}>
          <form onSubmit={submitEdit}>
            <div style={{ display:'grid', gap:8 }}>
              <div className="form-row">
                <label>Name</label>
                <input name="name" value={editing.name||''} onChange={e=>setEditing({...editing,name:e.target.value})} />
                {fieldErrors.name && <div className="form-error">{fieldErrors.name}</div>}
              </div>
              <div className="form-row">
                <label>Operator</label>
                <input name="operator" value={editing.operator||''} onChange={e=>setEditing({...editing,operator:e.target.value})} />
              </div>
              <div className="form-row">
                <label>Address</label>
                <input name="address" value={editing.address||''} onChange={e=>setEditing({...editing,address:e.target.value})} />
              </div>
              <div className="form-row">
                <label>Contact Phone</label>
                <input name="contact_phone" value={editing.contact_phone||''} onChange={e=>setEditing({...editing,contact_phone:e.target.value})} />
              </div>
              <div className="form-row">
                <label>Latitude</label>
                <input name="latitude" value={editing.latitude||''} onChange={e=>setEditing({...editing,latitude:e.target.value})} />
                {fieldErrors.latitude && <div className="form-error">{fieldErrors.latitude}</div>}
              </div>
              <div className="form-row">
                <label>Longitude</label>
                <input name="longitude" value={editing.longitude||''} onChange={e=>setEditing({...editing,longitude:e.target.value})} />
                {fieldErrors.longitude && <div className="form-error">{fieldErrors.longitude}</div>}
              </div>
              <div className="form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                {/* TEMPORARILY DISABLED */}
                {/* <button type='button' onClick={() => deleteFireStation(editing.id)} className="small-btn" style={{ backgroundColor: '#f44336', color: 'white' }}>Delete</button> */}
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
