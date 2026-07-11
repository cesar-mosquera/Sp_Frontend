import { formatTimestamp } from '../appPage';
import type { LogEntry } from '../appPage';
import { colorForContact } from '../utils/contactColor';

export interface Conversation {
  contact: string;
  entries: LogEntry[];
  lastEntry: LogEntry;
}

interface ConversationRowProps {
  conversation: Conversation;
  onOpen: (contact: string) => void;
}

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'contacto';
}

export default function ConversationRow({ conversation, onOpen }: ConversationRowProps) {
  const { contact, entries, lastEntry } = conversation;
  const avatarColor = colorForContact(contact);
  const initial = (contact || '?').trim().charAt(0).toUpperCase() || '?';
  const isLastOutgoing = lastEntry.direction === 'OUT';
  const preview = lastEntry.type === 'notificacion'
    ? `🔔 ${lastEntry.msg}`
    : `${isLastOutgoing ? '↑ ' : lastEntry.direction === 'IN' ? '↓ ' : ''}${lastEntry.msg}`;

  return (
    <button
      type="button"
      className="conversation-row"
      data-testid={`open-conversation-${slugify(contact)}`}
      onClick={() => onOpen(contact)}
      style={{ borderLeft: `3px solid ${avatarColor}` }}
    >
      <div className="conversation-avatar" style={{ background: avatarColor }}>
        {initial}
      </div>
      <div className="conversation-info">
        <div className="conversation-top-row">
          <strong>{contact}</strong>
          <small>{formatTimestamp(lastEntry.timestamp)}</small>
        </div>
        <div className="conversation-preview">{preview}</div>
      </div>
      <div className="conversation-count" title={`${entries.length} mensaje${entries.length === 1 ? '' : 's'}`}>
        {entries.length}
      </div>
    </button>
  );
}
