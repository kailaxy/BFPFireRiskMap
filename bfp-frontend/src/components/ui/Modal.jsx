import React, { useEffect, useRef } from 'react';
import './Modal.css';

// Minimal focus trap: keep Tab cycling inside the modal
function useFocusTrap(containerRef, open) {
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const focusable = container.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function onKey(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      if (e.key === 'Escape') { const close = container.querySelector('[data-modal-close]'); close?.click(); }
    }
    first?.focus();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [containerRef, open]);
}

export default function Modal({ open, onClose, children, title }) {
  const wrapRef = useRef(null);
  useFocusTrap(wrapRef, open);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-portal" role="dialog" aria-modal="true" aria-label={title || 'Dialog'}>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-wrap" ref={wrapRef}>
        <div className="modal-content">
          <div className="modal-header">
            {title && <h3 className="modal-title">{title}</h3>}
            <button className="modal-close" data-modal-close onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
