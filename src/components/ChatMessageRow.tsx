import type { RowComponentProps } from 'react-window';
import { formatTimestamp } from '../appPage';
import type { LogEntry } from '../appPage';
import { colorForContact } from '../utils/contactColor';

export interface ChatMessageRowProps {
  entries: LogEntry[];
  // Dentro del hilo de un solo contacto ya se muestra su nombre en el
  // encabezado -- repetirlo en cada burbuja es ruido. Por defecto se
  // muestra (uso en un feed con varios contactos mezclados).
  showContactName?: boolean;
}

export default function ChatMessageRow({ index, style, entries, showContactName = true }: RowComponentProps<ChatMessageRowProps>) {
  const entry = entries[index];
  const isOutgoing = entry.direction === 'OUT';
  const avatarColor = colorForContact(entry.contact);
  const initial = (entry.contact || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div style={{ ...style, paddingBottom: 12, boxSizing: 'border-box' }}>
      <div className={`chat-bubble-row${isOutgoing ? ' outgoing' : ''}`} style={{ height: '100%' }}>
        <div
          title={entry.contact}
          className="chat-avatar"
          style={{ background: avatarColor }}
        >
          {initial}
        </div>
        <article className="chat-message" style={{ borderColor: isOutgoing ? 'rgba(179, 0, 255, 0.4)' : `${avatarColor}66` }}>
          <div className="chat-header">
            <div>
              {showContactName && <strong>{entry.contact}</strong>}
              <div className="chat-label">
                {entry.type === 'notificacion'
                  ? 'Notificación'
                  : entry.direction === 'OUT' ? '↑ Enviado' : entry.direction === 'IN' ? '↓ Recibido' : 'Mensaje'}
              </div>
            </div>
            <small>{formatTimestamp(entry.timestamp)}</small>
          </div>
          <div className="chat-body">{entry.msg}</div>
        </article>
      </div>
    </div>
  );
}
