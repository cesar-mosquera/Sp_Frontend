import type { RowComponentProps } from 'react-window';
import { ICON_MAP, formatTime } from '../utils/mockData';
import type { BackendLog, LogMsg, DeviceInfo } from '../types/dashboard';

const stripHtml = (str: string) => str.replace(/<[^>]+>/g, '');

export interface LogEntryRowProps {
  entries: (BackendLog | LogMsg)[];
  isReal: boolean;
  knownDevices: Record<string, DeviceInfo>;
  onExpand: (idx: number) => void;
  onAppClick: (app: string) => void;
}

export default function LogEntryRow({ index, style, entries, isReal, knownDevices, onExpand, onAppClick }: RowComponentProps<LogEntryRowProps>) {
  const entry = entries[index];
  const app = isReal ? (entry as BackendLog).type || 'GENERAL' : (entry as LogMsg).app || 'LOG';
  const msg = isReal ? ((entry as BackendLog).content || '').slice(0, 100) : (entry as LogMsg).msg;
  const timeStr = isReal ? ((entry as BackendLog).timestamp || '').slice(11, 19) : formatTime((entry as LogMsg).timeOffset);
  const devId = (entry as BackendLog).device_id || '';
  const devName = knownDevices[devId]?.name || devId;
  const appUp = (app || '').toUpperCase();
  const ic = ICON_MAP[appUp] || { icon: '📋', cls: '' };

  return (
    <div style={{ ...style, paddingBottom: 8, boxSizing: 'border-box' }}>
      <div
        className="log-entry"
        style={{ height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}
        onClick={() => !isReal && onExpand(index)}
      >
        <div className={`log-icon ${ic.cls}`}>{ic.icon}</div>
        <div className="log-content">
          <div className="log-header">
            <span
              className="log-app"
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onAppClick(app); }}
            >
              {app}
            </span>
            <span className="log-time">{timeStr}</span>
          </div>
          <div className="log-msg">{stripHtml(msg)}</div>
          {devId ? <span className="log-device-badge" title={devId}>📱 {devName}</span> : null}
        </div>
      </div>
    </div>
  );
}
