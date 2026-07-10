import { useEffect, useState } from 'react';
import { API_BASE_URL, DASHBOARD_KEY } from '../config';

interface Props {
  token: string | null;
  role: string | null;
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

export default function ContactNetwork({ token, role, onSelectContact }: Props) {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (role === 'admin') headers['X-Dashboard-Key'] = DASHBOARD_KEY;
        if (token) headers['X-Session-Token'] = token;
        const res = await fetch(`${API_BASE_URL}/api/conversations?skip=0&limit=200`, { headers });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setConversations(json.conversations || []);
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    };
    fetchContacts();
    const interval = setInterval(fetchContacts, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token, role]);

  if (loading && conversations.length === 0) {
    return <div className="no-device-msg"><span>👥</span>Cargando contactos...</div>;
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
