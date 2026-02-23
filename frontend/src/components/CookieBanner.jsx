import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'essential_only');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      padding: '12px 16px',
      background: 'rgba(11, 18, 32, 0.97)',
      borderTop: '1px solid #1e2a3a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
        <span style={{ fontSize: 20 }}>🍪</span>
        <p style={{ margin: 0, color: '#c9d1e0', fontSize: 14, lineHeight: 1.5 }}>
          We use cookies to keep you logged in and improve your experience.{' '}
          <Link to="/cookie-policy" style={{ color: '#2f8cff', textDecoration: 'underline' }}>
            Learn more
          </Link>
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button
          onClick={handleDecline}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: '1px solid #2e3a4e',
            background: 'transparent',
            color: '#8a96a8',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Essential Only
        </button>
        <button
          onClick={handleAccept}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: '#2f8cff',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
