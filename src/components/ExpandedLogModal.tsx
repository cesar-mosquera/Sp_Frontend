import { LOG_MESSAGES, LOCATION_DATA, formatTime } from '../utils/mockData';

interface ExpandedLogModalProps {
  expandedIdx: number;
  setExpandedIdx: (idx: number | null) => void;
}

export default function ExpandedLogModal({ expandedIdx, setExpandedIdx }: ExpandedLogModalProps) {
  const entry = LOG_MESSAGES[expandedIdx];
  if (!entry) return null;

  const loc = LOCATION_DATA[entry.contact] || { lat: '00.0000°', lon: '00.0000°', ciudad: 'Desconocida', pais: 'Desconocido' };
  const statusTag = entry.type === 'outgoing'
    ? '<span class="tag warning">SATURADO</span>'
    : '<span class="tag success">RECIBIDO</span>';

  return (
    <div className="overlay active" id="overlay">
      <div className="overlay-bg" onClick={() => setExpandedIdx(null)} />
      <div className="expanded-card" id="expandedCard">
        <button
          className="close-btn"
          onClick={() => setExpandedIdx(null)}
          style={{
            position: 'absolute', top: 16, right: 16, width: 40, height: 40,
            border: '1px solid var(--neon-purple)', borderRadius: '50%',
            background: 'rgba(15, 0, 35, 0.9)', color: 'var(--neon-purple)',
            fontSize: 20, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Orbitron', monospace",
            boxShadow: '0 0 15px rgba(179, 0, 255, 0.2)', zIndex: 2,
          }}
        >
          ✕
        </button>
        <div className="expanded-header">
          <div
            className={`expanded-icon ${entry.iconClass}`}
            style={{
              borderColor: entry.iconClass === 'whatsapp' ? '#00e676' : entry.iconClass === 'sms' ? '#00f0ff' : entry.iconClass === 'call' ? '#ff0033' : entry.iconClass === 'telegram' ? '#0088cc' : entry.iconClass === 'instagram' ? '#e1306c' : '#ff5000',
              width: 48, height: 48, minWidth: 48, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, border: '2px solid', background: 'rgba(179,0,255,0.05)',
            }}
          >
            {entry.icon}
          </div>
          <div>
            <div className="expanded-app-name">{entry.app} — {entry.direction}</div>
            <div className="expanded-contact">
              <span className="contact-icon">{entry.contactShort}</span>
              {entry.contact}
              <span dangerouslySetInnerHTML={{ __html: statusTag }} />
            </div>
          </div>
        </div>

        <div className="expanded-section">
          <h3>Mensaje Completo</h3>
          <div className="expanded-msg-text">
            {entry.msg.replace(/<[^>]+>/g, '')}
          </div>
        </div>

        <div className="expanded-section">
          <h3>Metadatos de la Interceptación</h3>
          <div className="metadata-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Aplicación', entry.app, true],
              ['Dirección', entry.direction, false],
              ['Duración / Tamaño', entry.duration, true],
              ['Timestamp', formatTime(entry.timeOffset), false],
              ['Geolocalización', `${loc.lat}, ${loc.lon}`, true],
              ['Ubicación', `${loc.ciudad}, ${loc.pais}`, false],
              ['Protocolo', 'TLS 1.3 / Signal', true],
              ['Nivel de Confianza', '98.4%', false],
            ].map(([label, value, isCyan]) => (
              <div key={String(label)} className="metadata-item" style={{
                background: 'rgba(179,0,255,0.05)', borderRadius: 8,
                padding: '10px 12px', border: '1px solid rgba(179,0,255,0.08)',
              }}>
                <div className="m-label" style={{ fontSize: '0.6rem', fontFamily: "'Orbitron',monospace", color: 'var(--text-secondary)', letterSpacing: 1, textTransform: 'uppercase' }}>{String(label)}</div>
                <div className={`m-value${isCyan ? ' cyan' : ''}`} style={{ fontSize: '0.85rem', color: isCyan ? 'var(--neon-cyan)' : 'var(--text-primary)', marginTop: 2 }}>{String(value)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="expanded-section">
          <h3>Historial de Conversación</h3>
          <div className="conversation-history" style={{ maxHeight: 160, overflowY: 'auto' }}>
            {[
              { sender: entry.contact, text: '¿Has recibido la información?', type: 'incoming' },
              { sender: 'Tú', text: 'Afirmativo. Procediendo con la extracción.', type: 'outgoing' },
              { sender: entry.contact, text: 'Buen trabajo. Mantente en línea.', type: 'incoming' },
              { sender: entry.contact, text: entry.direction === 'Saliente' ? 'Te confirmo cuando esté listo.' : 'Actualización en 10 minutos.', type: 'incoming' },
            ].map((c, i) => (
              <div key={i} className={`conv-message ${c.type}`} style={{
                display: 'flex', gap: 8, marginBottom: 10,
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(179,0,255,0.03)',
                borderLeft: `2px solid ${c.type === 'incoming' ? 'var(--neon-cyan)' : 'var(--neon-purple)'}`,
                flexDirection: c.type === 'outgoing' ? 'row-reverse' : 'row',
                textAlign: c.type === 'outgoing' ? 'right' : 'left',
              }}>
                <div style={{ flex: 1 }}>
                  <div className="conv-sender" style={{ fontSize: '0.6rem', fontFamily: "'Orbitron',monospace", color: 'var(--text-secondary)' }}>{c.sender}</div>
                  <div className="conv-text" style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{c.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="expanded-section">
          <h3>Información Adicional</h3>
          <div className="data-row"><span className="label">Dispositivo origen</span><span className="value cyan">Samsung Galaxy S24 Ultra</span></div>
          <div className="data-row"><span className="label">IP de origen</span><span className="value cyan">192.168.{Math.floor(Math.random() * 255)}.{Math.floor(Math.random() * 255)}</span></div>
          <div className="data-row"><span className="label">Red</span><span className="value yellow">Starlink / VPN activa</span></div>
          <div className="data-row"><span className="label">Paquete capturado</span><span className="value cyan">#{String(Math.floor(Math.random() * 90000) + 10000)}</span></div>
          <div className="data-row"><span className="label">Estado forense</span><span className="value green">INTEGRIDAD VERIFICADA</span></div>
        </div>
      </div>
    </div>
  );
}
