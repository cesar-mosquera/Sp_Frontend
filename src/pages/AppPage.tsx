import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { List } from 'react-window';
import { APP_PAGE_CONFIG, API_BASE_URL } from '../config';
import { useSSEEvents } from '../contexts/SSEProvider';
import { usePagination } from '../hooks/usePagination';
import { normalize, formatTimestamp, matchesApp, mapBackendLogs, type LogEntry, type BackendLog } from '../appPage';
import { downloadCSV } from '../utils/export';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { useAuthStore } from '../store';
import ChatMessageRow from '../components/ChatMessageRow';
import React, { Suspense } from 'react';
const DeviceMap = React.lazy(() => import('../components/DeviceMap'));
import '../app-page.css';

interface Props {
  appKey: string;
}

const FILTER_ITEMS = [
  { type: 'all', label: 'Todos' },
  { type: 'message', label: 'Mensajes' },
  { type: 'notificacion', label: 'Notificaciones' },
];

export default function AppPage({ appKey }: Props) {
  const config = APP_PAGE_CONFIG[appKey];
  const [searchParams] = useSearchParams();

  const [data, setData] = useState<LogEntry[]>([]);
  const [rawData, setRawData] = useState<BackendLog[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'contact' | 'message'>('contact');
  const [filter, setFilter] = useState<'all' | 'message' | 'notificacion'>('all');
  const [resultCount, setResultCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  
  // Paginación con scroll infinito
  const { skip, limit, hasMore, loadMore, reset: resetPagination, setTotalCount } = usePagination({
    initialLimit: 50,
  });


  const fallbackSample: LogEntry[] = [
    { contact: 'Mi Reina', msg: 'Audio recibido de Mi Reina (0:47)', timestamp: '2026-06-28T14:12:00', type: 'message' },
    { contact: 'El Enlace', msg: 'Mensaje de voz de El Enlace (1:23)', timestamp: '2026-06-28T13:50:00', type: 'message' },
    { contact: 'Bot Secreto', msg: 'Documento PDF plan_operativo.pdf descargado', timestamp: '2026-06-28T13:35:00', type: 'notificacion' },
  ];

  const token = useAuthStore(s => s.token);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setConnectionError(null);
    let logs: BackendLog[] = [];
    let connectedOk = false;

    try {
      // Filtrar por app en el backend para optimizar con paginación
      const params = new URLSearchParams();
      params.append('app', config.appKey);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());
      const endpoint = `${API_BASE_URL}/api/dashboard-data?${params.toString()}`;
      const response = await fetchWithRetry(endpoint, {
        headers: { 'X-Session-Token': token || '' },
        timeoutMs: 7000,
      });

      if (response.ok) {
        connectedOk = true;
        setApiConnected(true);
        const json = await response.json();
        // Actualizar total count si está disponible
        if (json.total_count !== undefined) {
          setTotalCount(json.total_count);
        }
        
        let source: BackendLog[] = [];
        if (Array.isArray(json.logs)) source = json.logs;
        else if (Array.isArray(json.messages)) source = json.messages;
        else if (Array.isArray(json.data)) source = json.data;
        else if (Array.isArray(json)) source = json;
        // El backend ya filtra por app, pero mantenemos filtro local como respaldo
        logs = source.filter(entry => matchesApp(entry, config));
      } else {
        setConnectionError(`Error ${response.status}: No se pudo cargar datos`);
      }
    } catch (err) {
      console.warn('Backend no disponible tras varios intentos:', err);
      setConnectionError('No se pudo conectar al backend tras varios intentos - usando datos de ejemplo');
      logs = [];
    }

    if (logs.length === 0 && skip === 0) {
      // Solo mostrar datos de ejemplo si de verdad no se pudo conectar al backend.
      // Si el backend respondió (aunque sea sin resultados), se respeta esa realidad.
      if (connectedOk) {
        setData([]);
        setRawData([]);
      } else {
        setData(fallbackSample);
        setRawData([]);
      }
    } else if (logs.length > 0) {
      const MAX_ACCUMULATED = 2000;
      if (skip > 0) {
        setData(prev => {
          const merged = [...prev, ...mapBackendLogs(logs)];
          return merged.length > MAX_ACCUMULATED ? merged.slice(-MAX_ACCUMULATED) : merged;
        });
        setRawData(prev => {
          const merged = [...prev, ...logs];
          return merged.length > MAX_ACCUMULATED ? merged.slice(-MAX_ACCUMULATED) : merged;
        });
      } else {
        setData(mapBackendLogs(logs));
        setRawData(logs);
      }
    }
    setIsLoading(false);
  }, [config, skip, limit, setTotalCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // SSE connection for real-time updates (compartida via SSEProvider)
  const { isConnected: sseIsConnected } = useSSEEvents((event) => {
    if (event.type === 'log_entry' || event.type === 'new_data') {
      const newLog = event.data as BackendLog;
      // Solo procesar logs que coincidan con la app actual
      if (matchesApp(newLog, config)) {
        setData(prev => {
          const mappedNew = mapBackendLogs([newLog])[0];
          // Evitar duplicados por timestamp
          if (prev.some(item => item.timestamp === mappedNew.timestamp && item.contact === mappedNew.contact)) {
            return prev;
          }
          // Agregar nuevo log al inicio
          return [mappedNew, ...prev].slice(0, 100);
        });
        setRawData(prev => {
          if (prev.some(item => (item.id && item.id === newLog.id) || (item.timestamp === newLog.timestamp && item.contact === newLog.contact))) {
            return prev;
          }
          return [newLog, ...prev].slice(0, 100);
        });
      }
    }
  });

  useEffect(() => {
    setSseConnected(sseIsConnected);
  }, [sseIsConnected]);

  const filtered = useMemo(() => {
    const searchNormalized = normalize(search);
    return data
      .filter(item => {
        if (filter !== 'all' && item.type !== filter) return false;
        if (searchNormalized) {
          const text = `${item.contact} ${item.msg}`;
          if (!normalize(text).includes(searchNormalized)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'contact') return normalize(a.contact).localeCompare(normalize(b.contact));
        return normalize(a.msg).localeCompare(normalize(b.msg));
      });
  }, [data, filter, search, sort]);

  useEffect(() => {
    setResultCount(filtered.length);
  }, [filtered]);

  const exportToCSV = () => {
    const headers = ['Fecha', 'Contacto', 'Tipo', 'Mensaje'];
    const rows = filtered.map(log => [
      log.timestamp, log.contact, log.type, log.msg.replace(/<[^>]+>/g, ''),
    ]);
    downloadCSV(headers, rows, `${appKey}_logs_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Scroll infinito: se dispara cuando la lista virtualizada se acerca al final
  const handleRowsRendered = useCallback((visible: { startIndex: number; stopIndex: number }) => {
    if (hasMore && !isLoading && visible.stopIndex >= filtered.length - 5) {
      loadMore();
    }
  }, [hasMore, isLoading, filtered.length, loadMore]);

  return (
    <div
      className="page"
      style={
        {
          '--brand-color': config.headerColor,
          '--brand-color-soft': `${config.headerColor}2E`,
        } as React.CSSProperties
      }
    >
      <div className="header">
        <div className="brand">
          <div className="brand-icon">{config.icon}</div>
          <div className="brand-info">
            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link className="back-link" to="/seleccion">← Volver a Selección</Link>
          <Link
            className="back-link"
            to="/dashboard"
            style={{ background: 'rgba(0,240,255,0.15)', borderColor: '#00f0ff', color: '#00f0ff', boxShadow: '0 0 15px rgba(0,240,255,0.2)' }}
          >
            📊 Dashboard Central
          </Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <label htmlFor="searchInput">Buscar por contacto o mensaje</label>
          <div className="search-row">
            <input
              id="searchInput"
              type="search"
              placeholder="Ej. Mi Reina, alerta, audio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="button" onClick={() => setSearch('')}>Limpiar</button>
          </div>
        </div>
        <div className="actions-row">
          <button
            className={`action-button${sort === 'contact' ? ' active' : ''}`}
            onClick={() => setSort('contact')}
          >
            Ordenar por contacto
          </button>
          <button
            className={`action-button${sort === 'message' ? ' active' : ''}`}
            onClick={() => setSort('message')}
          >
            Ordenar por mensaje
          </button>
          <button
            className="action-button"
            style={{ background: 'rgba(0, 240, 255, 0.1)', borderColor: '#00f0ff', color: '#00f0ff' }}
            onClick={exportToCSV}
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      <div className="content">
        <aside className="sidebar">
          <h2>Indicadores</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <strong>{data.length}</strong>
              <span>Mensajes totales</span>
            </div>
            <div className="stat-card">
              <strong>{data.filter(item => item.type === 'notificacion').length}</strong>
              <span>Notificaciones</span>
            </div>
            <div className="stat-card">
              <strong>{new Set(data.map(item => normalize(item.contact))).size}</strong>
              <span>Contactos</span>
            </div>
          </div>
          <div className="filter-group">
            <h3>Filtrar por tipo</h3>
            {FILTER_ITEMS.map(item => (
              <button
                key={item.type}
                className={`filter-pill${filter === item.type ? ' active' : ''}`}
                data-type={item.type}
                onClick={() => setFilter(item.type as typeof filter)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{config.title}</h2>
              <p className="panel-subtitle">
                {isLoading ? '⏳ Cargando datos...' : connectionError ? '⚠️ ' + connectionError : 'Filtra mensajes y alertas por contacto o texto.'}
              </p>
            </div>
            <span className="result-count">{resultCount} elemento{resultCount === 1 ? '' : 's'}</span>
          </div>
          <div id="app-list" className={appKey === 'ubicacion' ? 'map-container' : 'chat-list'}>
            {appKey === 'ubicacion' ? (
              <Suspense fallback={<div style={{padding: 20, color: '#fff'}}>Cargando Mapa...</div>}>
                <div style={{ width: '100%', height: '600px' }}>
                  <DeviceMap logs={rawData} />
                </div>
              </Suspense>
            ) : filtered.length === 0 ? (
              <div className="empty-state">No se encontraron mensajes que coincidan.</div>
            ) : (
              <>
                <List
                  style={{ height: 600 }}
                  rowCount={filtered.length}
                  rowHeight={220}
                  rowComponent={ChatMessageRow}
                  rowProps={{ entries: filtered }}
                  onRowsRendered={handleRowsRendered}
                />
                {hasMore && (
                  <div
                    style={{
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.8rem',
                    }}
                  >
                    {isLoading ? '⏳ Cargando más mensajes...' : '↓ Desliza para cargar más'}
                  </div>
                )}
                {!hasMore && filtered.length > 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '16px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.75rem',
                  }}>
                    ✓ Mostrando todos los mensajes ({filtered.length})
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
