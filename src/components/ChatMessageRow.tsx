import type { RowComponentProps } from 'react-window';
import { formatTimestamp } from '../appPage';
import type { LogEntry } from '../appPage';
import { colorForContact } from '../utils/contactColor';

export interface ChatMessageRowProps {
  entries: LogEntry[];
}

export default function ChatMessageRow({ index, style, entries }: RowComponentProps<ChatMessageRowProps>) {
  const entry = entries[index];
  const isOutgoing = entry.direction === 'OUT';
  const avatarColor = colorForContact(entry.contact);
  const initial = (entry.contact || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div style={{ ...style, paddingBottom: 12, boxSizing: 'border-box' }}>
      <article
        className="chat-message"
        style={{
          height: '100%',
          boxSizing: 'border-box',
          overflowY: 'auto',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          borderLeft: isOutgoing ? '1px solid rgba(179, 0, 255, 0.2)' : `3px solid ${avatarColor}`,
          borderRight: isOutgoing ? `3px solid ${avatarColor}` : '1px solid rgba(179, 0, 255, 0.2)',
        }}
      >
        <div
          title={entry.contact}
          style={{
            width: 36, height: 36, minWidth: 36, borderRadius: '50%',
            background: avatarColor, color: '#fff', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', flexShrink: 0, marginTop: 2,
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="chat-header">
            <div>
              <strong>{entry.contact}</strong>
              <div className="chat-label">
                {entry.type === 'notificacion'
                  ? 'Notificación'
                  : entry.direction === 'OUT' ? '↑ Enviado' : entry.direction === 'IN' ? '↓ Recibido' : 'Mensaje'}
              </div>
            </div>
            <small>{formatTimestamp(entry.timestamp)}</small>
          </div>
          <div className="chat-body">{entry.msg}</div>
        </div>
      </article>
    </div>
  );
}
