import { useMemo, memo } from 'react';
import type { BackendLog } from '../types/dashboard';

interface Props {
  logs: BackendLog[];
  onSelectContact?: (contact: string, device: string) => void;
  onSelectPhone?: (phone: string, device: string) => void;
}

interface ContactSummary {
  name: string;
  phone: string;
  device: string;
  type: string;
  incoming: number;
  outgoing: number;
  lastSeen: string;
}

function ContactNetwork({ logs, onSelectContact, onSelectPhone }: Props) {
  const contacts = useMemo(() => {
    const map = new Map<string, ContactSummary>();

    for (const log of logs) {
      const dir = (log as any).direction;
      const contact = log.contact?.trim() || log.sender?.trim() || (log as any).phone?.trim() || '';
      if (!contact) continue;

      if (log.type === 'HEARTBEAT' || log.type === 'LOCATION') continue;

      const key = `${log.device_id}::${contact}::${(log as any).phone || ''}`;

      if (!map.has(key)) {
        map.set(key, {
          name: contact,
          phone: (log as any).phone || '',
          device: log.device_id || '',
          type: log.type || '',
          incoming: 0,
          outgoing: 0,
          lastSeen: log.timestamp || '',
        });
      }

      const entry = map.get(key)!;
      if (dir === 'IN') entry.incoming++;
      else if (dir === 'OUT') entry.outgoing++;
      else entry.incoming++;
      if ((log.timestamp || '') > entry.lastSeen) entry.lastSeen = log.timestamp || '';
    }

    return Array.from(map.values()).sort((a, b) => (b.incoming + b.outgoing) - (a.incoming + a.outgoing));
  }, [logs]);

  if (contacts.length === 0) {
    return (
      <div className="no-device-msg"><span>👥</span>Sin contactos identificados.</div>
    );
  }

  return (
    <div className="device-grid">
      {contacts.map(c => {
        const key = `${c.device}::${c.name}::${c.phone}`;
        const total = c.incoming + c.outgoing;
        const seen = c.lastSeen ? new Date(c.lastSeen) : null;
        const diffMin = seen ? Math.round((Date.now() - seen.getTime()) / 60000) : Infinity;
        const isRecent = diffMin < 60;

        return (
          <div
            key={key}
            className="device-chip"
            style={{ cursor: 'pointer', borderColor: isRecent ? 'rgba(0,240,255,0.3)' : undefined }}
            onClick={() => {
              if (onSelectContact && c.name) onSelectContact(c.name, c.device);
              if (onSelectPhone && c.phone) onSelectPhone(c.phone, c.device);
            }}
          >
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '0.75rem', letterSpacing: '1px', color: '#fff', marginBottom: 4 }}>
              {c.name.slice(0, 24)}
            </div>
            {c.phone && (
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontFamily: 'monospace' }}>
                {c.phone}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              <span>
                <span style={{ color: '#00ff88' }}>▼{c.incoming}</span>
                {' '}
                <span style={{ color: '#00f0ff' }}>▲{c.outgoing}</span>
              </span>
              <span>{total} msgs</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
              <span>📱 {c.device}</span>
              <span style={{ color: 'rgba(0,240,255,0.5)' }}>{c.type.slice(0, 10)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(ContactNetwork);
