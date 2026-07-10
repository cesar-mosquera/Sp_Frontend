import { DeviceInfo, BackendLog } from '../types/dashboard';
import { ICON_MAP } from '../utils/mockData';

interface DeviceDetailPanelProps {
  detailDevice: string;
  detailDeviceInfo: DeviceInfo;
  allBackendLogs: BackendLog[];
  detailTypeFilter: string;
  setDetailDevice: (devId: string | null) => void;
  setDetailTypeFilter: (filter: string) => void;
}

export default function DeviceDetailPanel({
  detailDevice,
  detailDeviceInfo,
  allBackendLogs,
  detailTypeFilter,
  setDetailDevice,
  setDetailTypeFilter
}: DeviceDetailPanelProps) {
  const detailLogs = allBackendLogs.filter(l => l.device_id === detailDevice);
  const detailTypes = [...new Set(detailLogs.map(l => l.type || 'GENERAL'))];
  const filteredDetailLogs = detailTypeFilter === 'all' ? detailLogs : detailLogs.filter(l => (l.type || 'GENERAL') === detailTypeFilter);

  const now = Date.now();
  const seenMs = new Date(detailDeviceInfo.last_seen).getTime();
  const isOnline = (now - seenMs) < 300000;
  const diffMin = Math.round((now - seenMs) / 60000);
  const seenText = diffMin < 1 ? 'Ahora mismo' : diffMin < 60 ? `Hace ${diffMin} min` : `Hace ${Math.round(diffMin / 60)}h`;

  return (
    <div className="dev-detail-overlay open" id="devDetailOverlay">
      <div className="dev-detail-topbar">
        <button className="dev-detail-back" onClick={() => setDetailDevice(null)}>← VOLVER</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span
            className="dev-detail-status-dot"
            style={{
              background: isOnline ? '#00ff88' : '#ff0033',
              boxShadow: isOnline ? '0 0 8px #00ff88' : '0 0 8px #ff0033',
            }}
          />
          <span className="dev-detail-title">{detailDeviceInfo.name || detailDevice}</span>
        </div>
        <span style={{ fontFamily: "'Orbitron',monospace", fontSize: '0.55rem', color: 'var(--text-secondary)', opacity: 0.5 }}>
          {detailDevice}
        </span>
      </div>

      <div className="dev-detail-info">
        <div className="dev-info-chip">
          <div className="dic-label">Estado</div>
          <div className="dic-value" style={{ color: isOnline ? '#00ff88' : '#ff0033' }}>
            {isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
          </div>
        </div>
        <div className="dev-info-chip">
          <div className="dic-label">Última conexión</div>
          <div className="dic-value">{seenText}</div>
        </div>
        <div className="dev-info-chip">
          <div className="dic-label">Total logs</div>
          <div className="dic-value">{detailDeviceInfo.count}</div>
        </div>
        <div className="dev-info-chip">
          <div className="dic-label">Tipos capturados</div>
          <div className="dic-value">{detailTypes.length}</div>
        </div>
        <div className="dev-info-chip">
          <div className="dic-label">Último dato</div>
          <div className="dic-value">{detailDeviceInfo.last_seen.slice(0, 19).replace('T', ' ')}</div>
        </div>
      </div>

      <div className="dev-detail-body">
        <div className="dev-log-section-title">📌 Registros de actividad</div>
        <div className="dev-type-filters">
          <span
            className={`dev-type-pill${detailTypeFilter === 'all' ? ' active-pill' : ''}`}
            onClick={() => setDetailTypeFilter('all')}
          >
            Todos ({detailLogs.length})
          </span>
          {detailTypes.map(t => {
            const cnt = detailLogs.filter(l => (l.type || 'GENERAL') === t).length;
            return (
              <span
                key={t}
                className={`dev-type-pill${detailTypeFilter === t ? ' active-pill' : ''}`}
                onClick={() => setDetailTypeFilter(t)}
              >
                {t} ({cnt})
              </span>
            );
          })}
        </div>
        {filteredDetailLogs.length === 0 ? (
          <div className="no-device-msg"><span>🔍</span>Sin registros para este filtro.</div>
        ) : (
          filteredDetailLogs.map((entry, idx) => {
            const appUp = (entry.type || 'GENERAL').toUpperCase();
            const ic = ICON_MAP[appUp] || { icon: '📋', cls: '' };
            const msg = (entry.content || '').slice(0, 120);
            const timeStr = (entry.timestamp || '').slice(0, 19).replace('T', ' ');
            const phone = entry.phone || '';
            return (
              <div key={entry.id || `detail-${idx}`} className="log-entry" style={{ cursor: 'default' }}>
                <div className={`log-icon ${ic.cls}`}>{ic.icon}</div>
                <div className="log-content">
                  <div className="log-header">
                    <span className="log-app">{entry.type || 'GENERAL'}</span>
                    <span className="log-time">{timeStr}</span>
                  </div>
                  {phone ? <div style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', opacity: 0.8, marginBottom: 2 }}>{phone}</div> : null}
                  <div className="log-msg">{msg}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
