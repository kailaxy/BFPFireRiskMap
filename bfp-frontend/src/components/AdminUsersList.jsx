import React, { useEffect, useState } from 'react';
import ConfirmToast from './ui/ConfirmToast';
import Modal from './ui/Modal';
import { API_BASE_URL } from '../config';

function getToken() { return localStorage.getItem('token'); }

function CreateUserForm({ onCreated, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('responder');
  const [stationId, setStationId] = useState('');
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { setUsername(''); setPassword(''); setEmail(''); setRole('responder'); setMessage(null); setLoading(false); }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/firestation/admin`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setStations(d.rows || []))
      .catch(() => setStations([]));
  }, []);

  async function submit(e) {
    e?.preventDefault?.();
    setMessage(null); setLoading(true);
    const token = getToken();
    if (!token) { setMessage({ type: 'error', text: 'No admin token available' }); setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/auth/admin/create-user`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ username, password, email, role, station_id: stationId || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setMessage({ type: 'success', text: `Created ${data.user.username}` });
      onCreated && onCreated(data.user);
      setTimeout(() => onClose(), 600);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{ width: '100%' }}>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontWeight: 600 }}>Username</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} required style={{ width: '100%', padding: 8, borderRadius: 8 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontWeight: 600 }}>Password</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} required type="password" style={{ width: '100%', padding: 8, borderRadius: 8 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontWeight: 600 }}>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" style={{ width: '100%', padding: 8, borderRadius: 8 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontWeight: 600 }}>Role</label>
        <select value={role} onChange={e=>setRole(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8 }}>
          <option value="responder">Responder</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontWeight: 600 }}>Station</label>
        <select value={stationId} onChange={e=>setStationId(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8 }}>
          <option value="">(none)</option>
          {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8 }}>Cancel</button>
  <button type="submit" disabled={loading} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--accent-blue)', color: '#fff', border: 'none' }}>{loading ? 'Creating...' : 'Create'}</button>
      </div>
  {message && <div style={{ marginTop: 10, color: message.type === 'error' ? '#dc2626' : 'var(--muted)' }}>{message.text}</div>}
    </form>
  );
}

export default function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [confirmToast, setConfirmToast] = useState(null);
  const [showTempModal, setShowTempModal] = useState(false);
  const [tempPasswordValue, setTempPasswordValue] = useState(null);
  const [copiedTemp, setCopiedTemp] = useState(false);

  async function fetchUsers() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/users`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setUsers(data.rows || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return setFiltered(users);
    setFiltered(users.filter(u => String(u.id).includes(q) || (u.username && u.username.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q))));
  }, [query, users]);

  async function changeRole(id, role) {
    try {
  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ role }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setUsers(u => u.map(x => x.id === data.user.id ? data.user : x));
    } catch (err) { alert('Error: ' + err.message); }
  }

  async function resetPassword(id) {
    if (!confirm('Reset password for this user?')) return;
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ reset_password: true }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      // show temporary password in a modal with copy button
      setTempPasswordValue(data.temp_password || '');
      setCopiedTemp(false);
      setShowTempModal(true);
    } catch (err) { alert('Error: ' + err.message); }
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to delete');
      setUsers(u => u.filter(x => x.id !== id));
      setConfirmToast('User deleted.');
    } catch (err) { alert('Error: ' + err.message); }
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Users</h2>
        <div>
          <button className="small-btn" onClick={() => setShowCreate(true)} style={{ background: '#10b981', color: '#fff' }}>+ Add user</button>
        </div>
      </div>
      {loading && <div style={{ marginTop: 8 }}>Loading...</div>}
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      <div style={{ display:'flex', gap:8, marginTop:8, marginBottom:8 }}>
        <input className="toolbar-search" placeholder="Search by ID, username or email" value={query} onChange={e=>setQuery(e.target.value)} />
        <button className="small-btn" onClick={()=>setQuery('')}>Reset</button>
      </div>
      <div className="table-responsive">
        <table className="admin-table" style={{ width: '100%', marginTop: 12 }}>
  <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Station</th><th className="col-hide-sm">Created</th><th>Actions</th></tr></thead>
        <tbody>
          {(filtered || users).map(u => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td className="truncate" title={u.username}>{u.username}</td>
              <td className="truncate" title={u.email}>{u.email}</td>
              <td>
                <select defaultValue={u.role} onChange={e=>changeRole(u.id, e.target.value)}>
                  <option value="responder">responder</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="station-cell">
                <StationSelect className="station-select" current={u.station_id} onChange={async (val) => {
                  try {
                    const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ station_id: val }) });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to update');
                    setUsers(us => us.map(x => x.id === data.user.id ? data.user : x));
                    // notify other components (stations manager) that a user was updated
                    try { window.dispatchEvent(new CustomEvent('bfp:user-updated', { detail: { user: data.user } })); } catch(e) {}
                    // notify other admin components that a user was updated
                    try { window.dispatchEvent(new CustomEvent('user:updated', { detail: { user: data.user } })); } catch(e){}
                  } catch (err) { alert('Error: ' + err.message); }
                }} />
              </td>
              <td className="col-hide-sm">{u.created_at}</td>
              <td className="action-td">
                <button className="small-btn" onClick={()=>resetPassword(u.id)}>Reset PW</button>
                {/* TEMPORARILY DISABLED */}
                {/* <button className="small-btn delete-btn" onClick={()=>deleteUser(u.id)} style={{ marginLeft: 8 }}>Delete</button> */}
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create user">
        <CreateUserForm onCreated={(user) => { fetchUsers(); try { setConfirmToast('User was added.'); } catch(e){} }} onClose={() => setShowCreate(false)} />
      </Modal>
      <Modal open={showTempModal} onClose={() => setShowTempModal(false)} title="Temporary password">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ wordBreak: 'break-all', background: '#111827', color: '#fff', padding: 12, borderRadius: 8, fontFamily: 'monospace' }}>{tempPasswordValue}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="small-btn" onClick={async () => {
              try {
                await navigator.clipboard.writeText(tempPasswordValue || '');
                setCopiedTemp(true);
                setTimeout(() => setCopiedTemp(false), 2000);
              } catch (e) {
                alert('Failed to copy to clipboard');
              }
            }}>{copiedTemp ? 'Copied' : 'Copy'}</button>
            <button className="small-btn" onClick={() => setShowTempModal(false)}>Close</button>
          </div>
        </div>
      </Modal>
      <ConfirmToast message={confirmToast} onClose={() => setConfirmToast(null)} duration={3000} />
    </div>
  );
}

function StationSelect({ current, onChange }) {
  const [stations, setStations] = useState([]);
  useEffect(() => {
    fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/firestation/admin`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setStations(d.rows || []))
      .catch(() => setStations([]));
  }, []);
  return (
    <select value={current || ''} onChange={e => onChange(e.target.value || null)}>
      <option value="">(none)</option>
      {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}
