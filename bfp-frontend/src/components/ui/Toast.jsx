import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

export default function Toast({ message, onClose, duration = 8000 }) {
  // message can be a string or a notification object { id, message, payload }
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => { setVisible(Boolean(message)); }, [message]);

  // Do not auto-dismiss; require user action to Close or View
  if (!message || !visible) return null;

  const isNotif = message && typeof message === 'object' && message.id;
  const shortText = isNotif ? `Fire Reported near ${((message.payload && message.payload.feature && message.payload.feature.properties && message.payload.feature.properties.address) || (message.message || '')).split(',')[0]}` : String(message).slice(0, 120);

  // handlers
  const onView = async () => {
    try { console.debug('[Toast] onView clicked, message=', message); } catch{ void 0 }
    try {
      // notify app to open ActiveFiresMenu and select the feature
      if (isNotif && message.payload && message.payload.fire_id) {
        try { window.__BFP_openActiveFire && window.__BFP_openActiveFire(message.payload.fire_id); } catch(e){}
      }
      // mark as read on server
      if (isNotif) {
        const token = localStorage.getItem('token');
          try {
          const resp = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/notifications/${message.id}/mark-read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(()=>{});
          try { console.debug('[Toast] mark-read response', resp && resp.status); } catch{ void 0 }
        } catch(e) { try{ console.debug('[Toast] mark-read error', e); }catch(e){} }
      }
    } finally {
      setVisible(false);
      onClose && onClose();
      try { window.__BFP_markShownRead && window.__BFP_markShownRead(message.id); } catch{ void 0 }
    }
  };

  const onDismiss = async () => {
    try { console.debug('[Toast] onDismiss clicked, message=', message); } catch{ void 0 }
    try {
      if (isNotif) {
        const token = localStorage.getItem('token');
          try {
          const resp = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/notifications/${message.id}/mark-read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(()=>{});
    try { console.debug('[Toast] mark-read response', resp && resp.status); } catch{ void 0 }
    } catch(e) { try{ console.debug('[Toast] mark-read error', e); }catch{ void 0 } }
      }
    } finally {
      setVisible(false);
      onClose && onClose();
      try { window.__BFP_markShownRead && window.__BFP_markShownRead(message.id); } catch{ void 0 }
    }
  };

  return (
    <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 20, zIndex: 9999 }}>
      <div style={{ minWidth: 340, maxWidth: 640, background: '#3b1b1b', color: '#fff', padding: '14px 16px', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.35)', display: 'flex', gap: 12, alignItems: 'center', border: '2px solid rgba(255,80,80,0.9)' }}>
        <div style={{ flex: '0 0 auto', width: 44, height: 44, borderRadius: 6, background: 'rgba(255,80,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#ffb3b3' }} aria-hidden>
          ⚠️
        </div>
        <div style={{ flex: '1 1 auto' }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{shortText}</div>
          <div style={{ fontSize: 12, opacity: 0.95 }}>{isNotif ? (message.message || '') : String(message)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onView} style={{ background: '#ff4d4d', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>View</button>
          <button onClick={onDismiss} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 10px', borderRadius: 6, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
