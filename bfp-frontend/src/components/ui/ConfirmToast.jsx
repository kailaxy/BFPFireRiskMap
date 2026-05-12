import React, { useEffect, useState } from 'react';

export default function ConfirmToast({ message, onClose, duration = 3000 }) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => { setVisible(Boolean(message)); }, [message]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      setVisible(false);
      onClose && onClose();
    }, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message || !visible) return null;

  return (
    <div style={{ position: 'fixed', right: 20, top: 24, zIndex: 9999 }}>
      <div style={{ minWidth: 260, background: '#063', color: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.28)', display: 'flex', gap: 12, alignItems: 'center', border: '2px solid rgba(40,200,120,0.9)' }}>
        <div style={{ flex: 1 }}>{String(message)}</div>
        <button aria-label="Close" onClick={() => { setVisible(false); onClose && onClose(); }} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  );
}
