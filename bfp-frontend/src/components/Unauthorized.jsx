import React from 'react';
import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <h2 style={{ marginBottom: 8 }}>Access restricted</h2>
        <p style={{ marginBottom: 16, opacity: 0.85 }}>
          Your account does not have permission to view this page.
        </p>
        <Link to="/" style={{ fontWeight: 600 }}>Return to home</Link>
      </div>
    </div>
  );
}
