import type { RowComponentProps } from 'react-window';
import { formatTimestamp } from '../appPage';
import type { LogEntry } from '../appPage';

export interface ChatMessageRowProps {
  entries: LogEntry[];
}

export default function ChatMessageRow({ index, style, entries }: RowComponentProps<ChatMessageRowProps>) {
  const entry = entries[index];

  return (
    <div style={{ ...style, paddingBottom: 12, boxSizing: 'border-box' }}>
      <article className="chat-message" style={{ height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
        <div className="chat-header">
          <div>
            <strong>{entry.contact}</strong>
            <div className="chat-label">{entry.type === 'notificacion' ? 'Notificación' : 'Mensaje'}</div>
          </div>
          <small>{formatTimestamp(entry.timestamp)}</small>
        </div>
        <div className="chat-body">{entry.msg}</div>
      </article>
    </div>
  );
}
