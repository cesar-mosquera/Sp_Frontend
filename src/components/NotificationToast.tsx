import { useEffect, useState, useCallback } from 'react';

interface Toast {
  id: number;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning';
  timestamp: string;
}

let _toastId = 0;
let _addToast: ((t: Omit<Toast, 'id'>) => void) | null = null;

export function notify(title: string, body: string, type: Toast['type'] = 'info') {
  _addToast?.({ title, body, type, timestamp: new Date().toLocaleTimeString() });
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  _addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    return () => { _addToast = null; };
  }, []);

  if (toasts.length === 0) return null;

  const colors: Record<Toast['type'], { bg: string; border: string; icon: string }> = {
    info: { bg: 'rgba(0,240,255,0.12)', border: 'rgba(0,240,255,0.3)', icon: 'ℹ️' },
    success: { bg: 'rgba(0,255,136,0.12)', border: 'rgba(0,255,136,0.3)', icon: '✅' },
    warning: { bg: 'rgba(255,170,0,0.12)', border: 'rgba(255,170,0,0.3)', icon: '⚠️' },
  };

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 360, width: '100%',
    }}>
      {toasts.map(t => {
        const c = colors[t.type];
        return (
          <div
            key={t.id}
            style={{
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 12, padding: '12px 16px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              animation: 'slideIn 0.3s ease',
              cursor: 'pointer',
            }}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span>{c.icon}</span>
              <span style={{
                fontFamily: "'Orbitron', monospace", fontSize: '0.65rem',
                color: '#00f0ff', letterSpacing: '1px', textTransform: 'uppercase',
              }}>
                {t.title}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#f0e6ff', lineHeight: 1.4 }}>
              {t.body}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              {t.timestamp}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
