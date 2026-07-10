import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { handleAuthResponse } from '../utils/authResponse';
import type { BackendLog } from '../types/dashboard';

interface Props {
  logs: BackendLog[];
  token: string | null;
  onSelectContact: (contact: string, device: string) => void;
}

interface ConversationData {
  id: number;
  device_id: string;
  contact: string;
  platform: string;
  last_message_at: string;
  last_direction: string;
  message_count: number;
  incoming_count: number;
  outgoing_count: number;
  created_at: string;
}

export default function ContactNetwork({ logs, token, onSelectContact }: Props) {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) headers['X-Session-Token'] = token;
        const res = handleAuthResponse(await fetch(`${API_BASE_URL}/api/conversations?skip=0&limit=200`, { headers }));
        if (!res.ok) {
          // Fallo real de conexion/servidor: recien ahi tiene sentido el modo
          // degradado derivado de logs locales.
          if (!cancelled) setUseFallback(true);
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          // Exito con 0 conversaciones es un estado real (aun no hay datos),
          // no un fallo -- no debe mostrar contactos sinteticos como si
          // fueran reales.
          setConversations(json.conversations || []);
          setUseFallback(false);
        }
      } catch { if (!cancelled) setUseFallback(true); }
      if (!cancelled) setLoading(false);
    };
    fetchContacts();
    const interval = setInterval(fetchContacts, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  if (loading && conversations.length === 0) {
    return <div className="no-device-msg"><span>👥</span>Cargando contactos...</div>;
  }

  if (useFallback) {
    const contacts = new Map<string, { name: string; device: string; incoming: number; outgoing: number; lastSeen: string }>();
    for (const log of logs) {
      const dir = (log.direction || '').toLowerCase();
      const contact = log.contact?.trim() || log.sender?.trim() || '';
      if (!contact || log.type === 'HEARTBEAT' || log.type === 'LOCATION') continue;
      const key = `${log.device_id}::${contact}`;
      if (!contacts.has(key)) contacts.set(key, { name: contact, device: log.device_id || '', incoming: 0, outgoing: 0, lastSeen: log.timestamp || '' });
      const e = contacts.get(key)!;
      if (dir === 'out' || dir === 'outgoing' || dir === 'saliente') e.outgoing++; else e.incoming++;
      if ((log.timestamp || '') > e.lastSeen) e.lastSeen = log.timestamp || '';
    }
    const fallbackList = Array.from(contacts.values()).sort((a, b) => (b.incoming + b.outgoing) - (a.incoming + a.outgoing));

    if (fallbackList.length === 0) {
      return <div className="no-device-msg"><span>👥</span>Sin contactos identificados.</div>;
    }

    return (
      <div className="device-grid">
        {fallbackList.map(c => {
          const total = c.incoming + c.outgoing;
          const seen = c.lastSeen ? new Date(c.lastSeen) : null;
          const diffMin = seen ? Math.round((Date.now() - seen.getTime()) / 60000) : Infinity;
          const isRecent = diffMin < 60;
          return (
            <div key={`${c.device}::${c.name}`} className="device-chip" style={{ cursor: 'pointer', borderColor: isRecent ? 'rgba(0,240,255,0.3)' : undefined }}
              onClick={() => onSelectContact(c.name, c.device)}
            >
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '0.75rem', letterSpacing: '1px', color: '#fff', marginBottom: 6 }}>{c.name.slice(0, 24)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                <span><span style={{ color: '#00ff88' }}>▼{c.incoming}</span> <span style={{ color: '#00f0ff' }}>▲{c.outgoing}</span></span>
                <span>{total} msgs</span>
              </div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>📱 {c.device}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (conversations.length === 0) {
    return <div className="no-device-msg"><span>👥</span>Sin contactos identificados.</div>;
  }

  return (
    <div className="device-grid">
      {conversations.map(c => {
        const total = c.incoming_count + c.outgoing_count;
        const seen = c.last_message_at ? new Date(c.last_message_at) : null;
        const diffMin = seen ? Math.round((Date.now() - seen.getTime()) / 60000) : Infinity;
        const isRecent = diffMin < 60;

        return (
          <div
            key={c.id}
            className="device-chip"
            style={{ cursor: 'pointer', borderColor: isRecent ? 'rgba(0,240,255,0.3)' : undefined }}
            onClick={() => onSelectContact(c.contact, c.device_id)}
          >
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '0.75rem', letterSpacing: '1px', color: '#fff', marginBottom: 4 }}>
              {c.contact.slice(0, 24)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              <span>
                <span style={{ color: '#00ff88' }}>▼{c.incoming_count}</span>
                {' '}
                <span style={{ color: '#00f0ff' }}>▲{c.outgoing_count}</span>
              </span>
              <span>{total} msgs</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
              <span>📱 {c.device_id}</span>
              <span style={{ color: 'rgba(0,240,255,0.5)' }}>{c.platform.slice(0, 10)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
