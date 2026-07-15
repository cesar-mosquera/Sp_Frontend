import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { List } from 'react-window';
import { APP_PAGE_CONFIG, API_BASE_URL } from '../config';
import { useSSEEvents } from '../contexts/SSEProvider';
import { usePagination } from '../hooks/usePagination';
import { normalize, matchesApp, mapBackendLogs, type LogEntry, type BackendLog } from '../appPage';
import { downloadCSV } from '../utils/export';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { handleAuthResponse } from '../utils/authResponse';
import { useAuthStore } from '../store';
import { colorForContact } from '../utils/contactColor';
import ChatMessageRow from '../components/ChatMessageRow';
import ConversationRow, { type Conversation } from '../components/ConversationRow';
import React, { Suspense } from 'react';
const DeviceMap = React.lazy(() => import('../components/DeviceMap'));
import '../app-page.css';

interface Props {
  appKey: string;
}

const FILTER_ITEMS = [
  { type: 'all', label: 'Todos', icon: '💬' },
  { type: 'message', label: 'Mensajes', icon: '✉️' },
  { type: 'notificacion', label: 'Notificaciones', icon: '🔔' },
] as const;

export default function AppPage({ appKey }: Props) {
  const config = APP_PAGE_CONFIG[appKey];
  const [searchParams] = useSearchParams();

  const [data, setData] = useState<LogEntry[]>([]);
  const [rawData, setRawData] = useState<BackendLog[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'contact' | 'message'>('message');
  const [filter, setFilter] = useState<'all' | 'message' | 'notificacion'>('all');
  const [resultCount, setResultCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // Distingue "no hay servidor y se muestran datos de ejemplo" (informativo,
  // no es un problema del usuario) de un error real con datos reales ya
  // cargados en pantalla (ese sí amerita una alerta).
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  // Contacto abierto actualmente (null = viendo la lista de conversaciones).
  // Cada conversacion se ve por separado -- los mensajes de un tercer
  // contacto nunca aparecen mientras se esta viendo el chat de otro.
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Paginación con scroll infinito
  const { skip, limit, hasMore, loadMore, setTotalCount } = usePagination({
    initialLimit: 50,
  });


  const fallbackSample: LogEntry[] = [
    { id: 'demo-1', contact: 'Mi Reina', msg: 'Audio recibido de Mi Reina (0:47)', timestamp: '2026-06-28T14:12:00', type: 'message', direction: 'IN', deviceId: 'demo' },
    { id: 'demo-2', contact: 'El Enlace', msg: 'Mensaje de voz de El Enlace (1:23)', timestamp: '2026-06-28T13:50:00', type: 'message', direction: 'OUT', deviceId: 'demo' },
    { id: 'demo-3', contact: 'Bot Secreto', msg: 'Documento PDF plan_operativo.pdf descargado', timestamp: '2026-06-28T13:35:00', type: 'notificacion', direction: 'IN', deviceId: 'demo' },
  ];

  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);
  const [accessDenied, setAccessDenied] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (role === 'admin') {
      setAccessDenied(false);
      setCheckingAccess(false);
      return;
    }
    setCheckingAccess(true);
    fetch(`${API_BASE_URL}/api/subscriptions`, {
      headers: { 'X-Session-Token': token || '' },
    })
      .then(r => r.json())
      .then(data => {
        const subs = data?.subscriptions || [];
        // El backend usa el mismo app_name en todos sus endpoints
        // (confirmado en /api/admin/plans y /api/admin/devices/{id}/
        // subscriptions: whatsapp, telegram, instagram, sms, facebook,
        // tiktok, google, ubicacion, llamadas) -- config.appKey ya
        // coincide directo, sin necesidad de traducir nada.
        const active = subs.some(
          (s: { app_name: string; active: number }) =>
            s.app_name === config.appKey && s.active
        );
        setAccessDenied(!active);
      })
      // Fail-closed: si no se pudo verificar la suscripcion (red, timeout,
      // backend caido), se niega el acceso en vez de concederlo. Lo
      // contrario dejaria ver el contenido real del canal ante cualquier
      // fallo de red, anulando el control de acceso.
      .catch(() => setAccessDenied(true))
      .finally(() => setCheckingAccess(false));
  }, [role, token, config.appKey]);

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
      const response = handleAuthResponse(await fetchWithRetry(endpoint, {
        headers: { 'X-Session-Token': token || '' },
        timeoutMs: 7000,
      }));

      if (response.ok) {
        connectedOk = true;
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
      setConnectionError('No se pudo conectar al backend tras varios intentos');
      logs = [];
    }

    if (logs.length === 0 && skip === 0) {
      // Solo mostrar datos de ejemplo si de verdad no se pudo conectar al backend.
      // Si el backend respondió (aunque sea sin resultados), se respeta esa realidad.
      if (connectedOk) {
        setData([]);
        setRawData([]);
        setUsingFallbackData(false);
      } else {
        // Sin conexión real: se muestran datos de ejemplo, así que el error
        // técnico deja de ser relevante para el usuario (no hay nada roto
        // desde su perspectiva, solo modo demo).
        setData(fallbackSample);
        setRawData([]);
        setUsingFallbackData(true);
        setConnectionError(null);
      }
    } else if (logs.length > 0) {
      setUsingFallbackData(false);
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
  useSSEEvents((event) => {
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
        // 'message' = mas recientes primero (coincide con el orden de la
        // lista de conversaciones y con lo que exporta el CSV).
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [data, filter, search, sort]);

  // Agrupa los mensajes/notificaciones por contacto -- cada persona con la
  // que se chatea es su propia conversacion, en vez de un feed plano donde
  // se mezclan todos los contactos. Ordenadas por actividad mas reciente
  // primero (o alfabeticamente si sort === 'contact'), igual que cualquier
  // app de chat real.
  const conversations = useMemo(() => {
    const byContact = new Map<string, LogEntry[]>();
    for (const entry of filtered) {
      const key = entry.contact || 'Contacto desconocido';
      if (!byContact.has(key)) byContact.set(key, []);
      byContact.get(key)!.push(entry);
    }
    const list: Conversation[] = Array.from(byContact.entries()).map(([contact, entries]) => {
      const lastEntry = entries.reduce((latest, e) =>
        new Date(e.timestamp).getTime() > new Date(latest.timestamp).getTime() ? e : latest
      );
      return { contact, entries, lastEntry };
    });
    if (sort === 'contact') {
      list.sort((a, b) => normalize(a.contact).localeCompare(normalize(b.contact)));
    } else {
      list.sort((a, b) => new Date(b.lastEntry.timestamp).getTime() - new Date(a.lastEntry.timestamp).getTime());
    }
    return list;
  }, [filtered, sort]);

  // Si el contacto abierto ya no tiene mensajes bajo los filtros actuales
  // (ej. cambio de busqueda/tipo), se vuelve solo a la lista de
  // conversaciones en vez de dejar un chat vacio y "atascado".
  useEffect(() => {
    if (selectedContact && !conversations.some(c => c.contact === selectedContact)) {
      setSelectedContact(null);
    }
  }, [selectedContact, conversations]);

  const threadEntries = useMemo(() => {
    if (!selectedContact) return [];
    const conv = conversations.find(c => c.contact === selectedContact);
    if (!conv) return [];
    return [...conv.entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [conversations, selectedContact]);

  useEffect(() => {
    setResultCount(selectedContact ? threadEntries.length : conversations.length);
  }, [conversations, threadEntries, selectedContact]);

  const exportToCSV = () => {
    const headers = ['Fecha', 'Contacto', 'Tipo', 'Mensaje'];
    const rows = filtered.map(log => [
      log.timestamp, log.contact, log.type, log.msg.replace(/<[^>]+>/g, ''),
    ]);
    downloadCSV(headers, rows, `${appKey}_logs_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return checkingAccess ? (
    <div className="page" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0014', color: '#a580c7', fontFamily: 'monospace' }}>
      Verificando acceso...
    </div>
  ) : accessDenied ? (
    <div className="page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0014', color: '#ff0055', fontFamily: 'monospace', padding: 40, textAlign: 'center', gap: 16 }}>
      <span style={{ fontSize: '3rem' }}>🔒</span>
      <h1 style={{ color: '#ff0055', fontSize: '1.4rem' }}>Sin Suscripción</h1>
      <p style={{ color: '#a580c7', fontSize: '0.85rem', maxWidth: 300, lineHeight: 1.5 }}>
        No tienes acceso a este canal. Solicita al administrador que active la suscripción para <strong>{config.title}</strong>.
      </p>
      <Link className="back-link" to="/seleccion" style={{ marginTop: 12, display: 'inline-block', padding: '10px 24px', background: 'rgba(179,0,255,0.2)', border: '1px solid rgba(179,0,255,0.3)', borderRadius: 12, color: '#d5a6ff', textDecoration: 'none', fontFamily: 'monospace' }}>
        ← Volver a Selección
      </Link>
    </div>
  ) : (
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
          <Link className="back-link accent-cyan" to="/dashboard">
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
            Más recientes primero
          </button>
          <button
            className="action-button accent-cyan"
            onClick={exportToCSV}
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      <div className="content">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{selectedContact || config.title}</h2>
              <p className={`panel-subtitle${connectionError ? ' panel-subtitle--alert' : usingFallbackData ? ' panel-subtitle--info' : ''}`}>
                {isLoading
                  ? '⏳ Cargando datos...'
                  : connectionError
                  ? '⚠️ ' + connectionError
                  : usingFallbackData
                  ? '🧪 Sin conexión al servidor — mostrando datos de ejemplo.'
                  : appKey === 'ubicacion'
                  ? 'Tocá una tarjeta para centrar el mapa en ese momento.'
                  : selectedContact
                  ? 'Conversación individual, sin mezclar con otros contactos.'
                  : 'Cada contacto tiene su propia conversación.'}
              </p>
            </div>
            {appKey !== 'ubicacion' && (
              <span className="result-count">
                {selectedContact
                  ? `${resultCount} mensaje${resultCount === 1 ? '' : 's'}`
                  : `${resultCount} conversaci${resultCount === 1 ? 'ón' : 'ones'}`}
              </span>
            )}
          </div>

          {/* Pestañas de filtro estilo WhatsApp (Todos/Mensajes/Notificaciones
              con contador), justo debajo del encabezado y por encima de la
              lista -- solo tiene sentido mirando la lista de conversaciones,
              no dentro de un hilo abierto ni en el mapa de ubicacion. */}
          {appKey !== 'ubicacion' && !selectedContact && (
            <div className="filter-tabs" role="tablist" aria-label="Filtrar conversaciones por tipo">
              {FILTER_ITEMS.map(item => {
                const count = item.type === 'all'
                  ? data.length
                  : data.filter(entry => entry.type === item.type).length;
                return (
                  <button
                    key={item.type}
                    type="button"
                    role="tab"
                    aria-selected={filter === item.type}
                    className={`filter-tab${filter === item.type ? ' active' : ''}`}
                    onClick={() => setFilter(item.type as typeof filter)}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                    <span className="filter-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedContact && appKey !== 'ubicacion' && (
            <div className="thread-header" key={`header-${selectedContact}`}>
              <button
                type="button"
                className="back-link accent-brand"
                data-testid="back-to-conversations"
                onClick={() => setSelectedContact(null)}
              >
                ← Volver a conversaciones
              </button>
              <div className="thread-header-contact">
                <div className="thread-avatar" style={{ background: colorForContact(selectedContact) }}>
                  {(selectedContact.trim().charAt(0) || '?').toUpperCase()}
                </div>
                <strong>{selectedContact}</strong>
              </div>
            </div>
          )}

          <div id="app-list" className={appKey === 'ubicacion' ? 'map-container' : 'chat-list'}>
            {appKey === 'ubicacion' ? (
              <Suspense fallback={<div style={{padding: 20, color: '#fff'}}>Cargando Mapa...</div>}>
                <div style={{ width: '100%', height: '600px' }}>
                  <DeviceMap logs={rawData} />
                </div>
              </Suspense>
            ) : isLoading && conversations.length === 0 ? (
              <div className="empty-state" data-testid="app-list-loading">⏳ Cargando datos...</div>
            ) : selectedContact ? (
              threadEntries.length === 0 ? (
                <div className="empty-state">No se encontraron mensajes que coincidan.</div>
              ) : (
                <div className="thread-messages-enter" key={`messages-${selectedContact}`}>
                  <List
                    style={{ height: 600 }}
                    rowCount={threadEntries.length}
                    rowHeight={220}
                    rowComponent={ChatMessageRow}
                    rowProps={{ entries: threadEntries, showContactName: false }}
                  />
                </div>
              )
            ) : conversations.length === 0 ? (
              <div className="empty-state">No se encontraron conversaciones que coincidan.</div>
            ) : (
              <>
                <div className="conversation-list">
                  {conversations.map(conv => (
                    <ConversationRow key={conv.contact} conversation={conv} onOpen={setSelectedContact} />
                  ))}
                </div>
                {hasMore && (
                  <button
                    type="button"
                    className="load-more-btn"
                    data-testid="load-more-messages"
                    onClick={loadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? '⏳ Cargando más mensajes...' : '📥 Cargar mensajes más antiguos'}
                  </button>
                )}
                {!hasMore && data.length > 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '16px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.75rem',
                  }}>
                    ✓ Mostrando todos los mensajes ({data.length})
                  </div>
                )}
              </>
            )}
          </div>
        </section>

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
        </aside>
      </div>
    </div>
  );
}
