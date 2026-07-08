import { useEffect, useRef, useState, useCallback } from 'react';
import React, { Suspense, useMemo } from 'react';
import DeviceDetailPanel from '../components/DeviceDetailPanel';
import ExpandedLogModal from '../components/ExpandedLogModal';
import { LogMsg, BackendLog, DeviceInfo } from '../types/dashboard';
import { ICON_MAP, LOG_MESSAGES, formatTime } from '../utils/mockData';

import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE_URL, DASHBOARD_KEY, APP_PAGE_MAP } from '../config';
import { useAuthStore } from '../store';
import { useSSE } from '../hooks/useSSE';
import { usePagination } from '../hooks/usePagination';
import { downloadCSV } from '../utils/export';
const ChartsPanel = React.lazy(() => import('../components/ChartsPanel'));
const DeviceMap = React.lazy(() => import('../components/DeviceMap'));
import '../styles/dashboard.css';

export default function DashboardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [searchParams] = useSearchParams();
  const selectedApp = searchParams.get('app');

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [allBackendLogs, setAllBackendLogs] = useState<BackendLog[]>([]);
  const [knownDevices, setKnownDevices] = useState<Record<string, DeviceInfo>>({});
  const [activeDeviceFilter, setActiveDeviceFilter] = useState('all');
  const [activeAppFilter, setActiveAppFilter] = useState(selectedApp || 'all');
  const [detailDevice, setDetailDevice] = useState<string | null>(null);
  const [detailTypeFilter, setDetailTypeFilter] = useState('all');
  const [listHeight, setListHeight] = useState(400);
  const [time, setTime] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  // Ref to pause canvas animation
  const isModalOpenRef = useRef(false);
  useEffect(() => {
    isModalOpenRef.current = expandedIdx !== null || detailDevice !== null;
  }, [expandedIdx, detailDevice]);

  
  // Advanced Search State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Paginación
  const { skip, limit, hasMore, loadMore, reset: resetPagination, setTotalCount, totalCount } = usePagination({
    initialLimit: 50,
  });

  useEffect(() => {
    const update = () => setListHeight(window.innerHeight - 280);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedApp) setActiveAppFilter(selectedApp);
  }, [selectedApp]);

  // SSE connection for real-time updates
  const { isConnected: sseIsConnected } = useSSE('/api/sse', (event) => {
    if (event.type === 'new_data') {
      // new_data solo trae {device_id, type, count}, no es un log completo
      // Incrementar contador para forzar recarga desde el principio
      resetPagination();
      setRefreshCounter(c => c + 1);
    } else if (event.type === 'log_entry') {
      const newLog = event.data as BackendLog;
      if (!newLog || !newLog.id) return;
      setAllBackendLogs(prev => {
        if (prev.some(log => log.id === newLog.id)) return prev;
        return [newLog, ...prev].slice(0, 100);
      });
      if (newLog.device_id) {
        const deviceId = newLog.device_id;
        setKnownDevices(prev => {
          const updated = { ...prev };
          if (!updated[deviceId]) {
            updated[deviceId] = {
              name: deviceId,
              last_seen: newLog.timestamp || '',
              count: 0
            };
          }
          updated[deviceId].count++;
          if (newLog.timestamp && newLog.timestamp > updated[deviceId].last_seen) {
            updated[deviceId].last_seen = newLog.timestamp;
          }
          return updated;
        });
      }
    } else if (event.type === 'device_registered') {
      loadDevices();
    }
  }, true);

  useEffect(() => {
    setSseConnected(sseIsConnected);
  }, [sseIsConnected]);

  const loadDevices = useCallback(async () => {
    try {
      const devRes = await fetch(API_BASE_URL + '/devices', {
        headers: { 'X-Master-Key': DASHBOARD_KEY, 'X-Dashboard-Key': DASHBOARD_KEY },
      });
      if (devRes.ok) {
        const devData = await devRes.json();
        if (devData.devices) {
          setKnownDevices(prev => {
            const updated = { ...prev };
            devData.devices.forEach((d: { device_id: string; name?: string; last_seen?: string }) => {
              if (updated[d.device_id]) {
                updated[d.device_id].name = d.name || d.device_id;
                if (d.last_seen) updated[d.device_id].last_seen = d.last_seen;
              } else {
                updated[d.device_id] = {
                  name: d.name || d.device_id,
                  last_seen: d.last_seen || '',
                  count: 0
                };
              }
            });
            return updated;
          });
        }
      }
    } catch (e) { console.warn('Error loading devices:', e); }
  }, []);

  // Wireframe canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    let animId: number;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = Math.floor((W * H) / 22000);
    for (let i = 0; i < count; i++) {
      nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 2 + 1 });
    }

    const draw = () => {
      if (!isModalOpenRef.current) {
        ctx.clearRect(0, 0, W, H);
        for (const n of nodes) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }
        const maxDist = Math.min(W, H) * 0.15;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDist) {
              ctx.strokeStyle = `rgba(179, 0, 255, ${(1 - dist / maxDist) * 0.25})`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
            }
          }
        }
        for (const n of nodes) {
          ctx.fillStyle = `rgba(179, 0, 255, ${n.r * 0.15})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        }
        const redNodes = nodes.slice(0, Math.floor(nodes.length * 0.08));
        for (const n of redNodes) {
          ctx.fillStyle = `rgba(255, 0, 51, ${n.r * 0.1})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);

  // Load backend data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setConnectionError(null);
    try {
      let endpoint = API_BASE_URL + '/api/dashboard-data';
      const params = new URLSearchParams();
      if (selectedApp) params.append('app', selectedApp);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());
      if (startDate) params.append('start_date', startDate + 'T00:00:00Z');
      if (endDate) params.append('end_date', endDate + 'T23:59:59Z');
      if (searchQuery) params.append('search', searchQuery);
      if (params.toString()) endpoint += `?${params.toString()}`;
      
      const res = await fetch(endpoint, { 
        headers: { 
          'X-Dashboard-Key': role === 'admin' ? DASHBOARD_KEY : '',
          'X-Session-Token': token || ''
        } 
      });
      if (!res.ok) {
        setConnectionError(`Error ${res.status}: No se pudo conectar al backend`);
        return;
      }
      const data = await res.json();
      if (!data || !data.stats) {
        setConnectionError('Datos inválidos recibidos del backend');
        return;
      }
      setApiConnected(true);

      // Actualizar total count si está disponible
      if (data.total_count !== undefined) {
        setTotalCount(data.total_count);
      }

      const s = data.stats;
      const el = (id: string) => document.getElementById(id);

      if (el('totalOps')) el('totalOps')!.textContent = s.total_operations?.toLocaleString() ?? '1,284';
      if (el('successRate')) el('successRate')!.textContent = (s.success_rate ?? '94.7') + '%';
      if (el('activeAgents')) el('activeAgents')!.textContent = s.active_agents ?? '47';
      if (el('onlineAgents')) el('onlineAgents')!.textContent = s.agents_online ?? '32';
      if (el('dataProcessed')) el('dataProcessed')!.textContent = s.data_processed_tb ?? '2.4';
      if (el('dataToday')) el('dataToday')!.textContent = s.data_processed_today_gb ?? '386';
      if (el('signals')) el('signals')!.textContent = Math.max(1, Math.floor((s.intercepts_24h ?? 18) * 0.3)).toString();
      if (el('priority')) el('priority')!.textContent = Math.max(1, Math.floor((s.active_agents ?? 47) * 0.15)).toString();
      const fill = document.querySelector('.progress-bar .fill') as HTMLElement;
      if (fill) fill.style.width = (s.success_rate ?? 94.7) + '%';

      if (data.logs?.length) {
        if (skip > 0) {
          setAllBackendLogs(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const newLogs = data.logs.filter((l: BackendLog) => l.id && !existingIds.has(l.id));
            return [...prev, ...newLogs];
          });
        } else {
          setAllBackendLogs(data.logs);
        }
        setKnownDevices(prev => {
          const updated = { ...prev };
          data.logs.forEach((log: BackendLog) => {
            const devId = log.device_id;
            if (!devId) return;
            if (!updated[devId]) {
              updated[devId] = { name: devId, last_seen: log.timestamp ?? '', count: 0 };
            }
            updated[devId].count++;
            if ((log.timestamp ?? '') > updated[devId].last_seen) {
              updated[devId].last_seen = log.timestamp ?? '';
            }
          });
          return updated;
        });
        try {
          const devRes = await fetch(API_BASE_URL + '/devices', {
            headers: { 'X-Master-Key': DASHBOARD_KEY, 'X-Dashboard-Key': DASHBOARD_KEY },
          });
          if (devRes.ok) {
            const devData = await devRes.json();
            if (devData.devices) {
              setKnownDevices(prev => {
                const updated = { ...prev };
                devData.devices.forEach((d: { device_id: string; name?: string; last_seen?: string }) => {
                  if (updated[d.device_id]) {
                    updated[d.device_id].name = d.name || d.device_id;
                    if (d.last_seen) updated[d.device_id].last_seen = d.last_seen;
                  }
                });
                return updated;
              });
            }
          }
        } catch (e) { console.warn('Error loading device names:', e); }
        if (selectedApp) setActiveAppFilter(selectedApp);
      }
    } catch (err) {
      console.warn('Backend no disponible, usando datos locales:', err);
      setConnectionError('No se pudo conectar al backend - usando datos locales');
    } finally {
      setIsLoading(false);
    }
  }, [selectedApp, skip, limit]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData, refreshCounter]);

  // Handle Search Trigger
  const handleSearch = () => {
    resetPagination();
    setRefreshCounter(c => c + 1);
  };

  const exportToCSV = () => {
    setIsExporting(true);
    const headers = ['Fecha', 'Dispositivo', 'Tipo', 'Contacto', 'Mensaje'];
    const rows = filteredLogsMemo.map(log => {
      const isReal = 'device_id' in log;
      const date = isReal ? ((log as BackendLog).timestamp || '') : formatTime((log as LogMsg).timeOffset);
      const device = isReal ? ((log as BackendLog).device_id || 'N/A') : 'N/A';
      const type = isReal ? ((log as BackendLog).type || '') : ((log as LogMsg).app || '');
      const contact = isReal ? ((log as BackendLog).phone || (log as BackendLog).contact || '') : ((log as LogMsg).contact || '');
      const content = (isReal ? ((log as BackendLog).content || (log as BackendLog).msg || '') : ((log as LogMsg).msg || '')).replace(/<[^>]+>/g, '');
      return [date, device, type, contact, content];
    });
    downloadCSV(headers, rows, `reporte_logs_${new Date().toISOString().split('T')[0]}.csv`);
    setIsExporting(false);
  };

  const sourceLogs = allBackendLogs.length > 0 ? allBackendLogs : LOG_MESSAGES;
  const isReal = allBackendLogs.length > 0;

  const deviceIds = Object.keys(knownDevices);

  const filteredLogsMemo = useMemo(() => {
    let result = sourceLogs;
    if (activeDeviceFilter !== 'all') {
      result = result.filter(e => 'device_id' in e && (e as BackendLog).device_id === activeDeviceFilter);
    }
    if (activeAppFilter !== 'all') {
      result = result.filter(e => {
        if (isReal) {
          return ((e as BackendLog).type || 'GENERAL').toLowerCase() === String(activeAppFilter).toLowerCase();
        }
        return ((e as LogMsg).app || '').toLowerCase() === String(activeAppFilter).toLowerCase();
      });
    }
    return result;
  }, [sourceLogs, activeDeviceFilter, activeAppFilter, isReal]);

  const stripHtml = (str: string) => str.replace(/<[^>]+>/g, '');

  const renderLogEntry = (entry: BackendLog | LogMsg, idx: number) => {
    const app = isReal ? (entry as BackendLog).type || 'GENERAL' : (entry as LogMsg).app || 'LOG';
    const msg = isReal ? ((entry as BackendLog).content || '').slice(0, 100) : (entry as LogMsg).msg;
    const timeStr = isReal ? ((entry as BackendLog).timestamp || '').slice(11, 19) : formatTime((entry as LogMsg).timeOffset);
    const devId = (entry as BackendLog).device_id || '';
    const devName = knownDevices[devId]?.name || devId;
    const appUp = (app || '').toUpperCase();
    const ic = ICON_MAP[appUp] || { icon: '📋', cls: '' };

    return (
      <div key={idx} className="log-entry" onClick={() => !isReal && setExpandedIdx(idx)}>
        <div className={`log-icon ${ic.cls}`}>{ic.icon}</div>
        <div className="log-content">
          <div className="log-header">
            <span
              className="log-app"
              style={{ cursor: 'pointer' }}
              onClick={e => {
                e.stopPropagation();
                const key = (app || '').toLowerCase();
                const page = APP_PAGE_MAP[key];
                if (page) window.location.href = `/${page}?app=${encodeURIComponent(app)}`;
                else setActiveAppFilter(app);
              }}
            >
              {app}
            </span>
            <span className="log-time">{timeStr}</span>
          </div>
          <div className="log-msg">{stripHtml(msg)}</div>
          {devId ? <span className="log-device-badge" title={devId}>📱 {devName}</span> : null}
        </div>
      </div>
    );
  };

  const renderDeviceChips = () => {
    if (deviceIds.length === 0) {
      return <div className="no-device-msg"><span>📡</span>No hay dispositivos con datos registrados aún.</div>;
    }
    const now = Date.now();
    return deviceIds.map(devId => {
      const dev = knownDevices[devId];
      const seenMs = new Date(dev.last_seen).getTime();
      const diffMin = Math.round((now - seenMs) / 60000);
      const isOnline = diffMin <= 5;
      const seenText = diffMin < 1 ? 'Ahora mismo' : diffMin < 60 ? `Hace ${diffMin} min` : `Hace ${Math.round(diffMin / 60)}h`;
      return (
        <div
          key={devId}
          className={`device-chip${isOnline ? '' : ' offline-device'}${activeDeviceFilter === devId ? ' active-device' : ''}`}
          onClick={() => openDeviceDetail(devId)}
        >
          <div className="device-name">📱 {dev.name || devId}</div>
          <div className="device-id-label">{devId}</div>
          <div className="device-status-row">
            <span>
              <span className={`log-status ${isOnline ? 'online' : 'offline'}`} />
              <span className="device-seen">{seenText}</span>
            </span>
            <span className="device-count-badge">{dev.count} logs</span>
          </div>
        </div>
      );
    });
  };

  const openDeviceDetail = (devId: string) => {
    setDetailDevice(devId);
    setDetailTypeFilter('all');
  };

  const detailDeviceInfo = detailDevice ? knownDevices[detailDevice] : null;
  const detailLogs = detailDevice ? allBackendLogs.filter(l => l.device_id === detailDevice) : [];
  const detailTypes = [...new Set(detailLogs.map(l => l.type || 'GENERAL'))];
  const filteredDetailLogs = detailTypeFilter === 'all' ? detailLogs : detailLogs.filter(l => (l.type || 'GENERAL') === detailTypeFilter);

  return (
    <>
      <canvas ref={canvasRef} id="wireframe-canvas" />
      <div className="red-lighting" />

      <div className="container" id="mainContainer">
        <div style={{ textAlign: 'left', marginBottom: 10 }}>
          <Link
            to="/seleccion"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(179, 0, 255, 0.15)', border: '1px solid rgba(179, 0, 255, 0.3)',
              color: '#00f0ff', padding: '8px 18px', borderRadius: 999,
              fontFamily: "'Orbitron', monospace", fontWeight: 600,
              fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase',
              textDecoration: 'none', boxShadow: '0 0 20px rgba(179, 0, 255, 0.2)',
              transition: 'all 0.3s ease',
            }}
          >
            ← Volver a Selección de Canales
          </Link>
        </div>

        <header>
          <h1>{selectedApp ? `Operaciones: ${selectedApp.toUpperCase()}` : 'Central de Operaciones Inteligentes'}</h1>
          <p className="subtitle">Panel de Control de Espionaje</p>
          <div className="header-line" />
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            marginTop: 12,
            fontSize: '0.7rem',
            fontFamily: "'Orbitron', monospace",
            letterSpacing: '1px'
          }}>
            <span 
              style={{ 
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: sseConnected || apiConnected ? '#00ff88' : '#ff0033',
                boxShadow: sseConnected || apiConnected ? '0 0 8px #00ff88' : '0 0 8px #ff0033',
                animation: sseConnected || apiConnected ? 'pulse 2s ease-in-out infinite' : 'none'
              }}
            />
            <span style={{ 
              color: sseConnected || apiConnected ? '#00ff88' : '#ff0033',
              opacity: 0.8
            }}>
              {sseConnected ? 'CONECTADO - TIEMPO REAL' : apiConnected ? 'CONECTADO' : 'DESCONECTADO - MODO OFFLINE'}
            </span>
          </div>
        </header>

        <div className="dashboard">
          <div className="card card-span-2">
            <div className="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              Métricas Generales
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <div className="stat-value" id="totalOps">1,284</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  <div className="stat-label">Operaciones Totales</div>
                </div>
                <div className="stat-sub">+12.4% vs mes anterior</div>
              </div>
              <div className="metric-item">
                <div className="stat-value" id="successRate">94.7%</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <div className="stat-label">Tasa de Éxito</div>
                </div>
                <div className="stat-sub">+2.1% esta semana</div>
              </div>
            </div>
            <div className="progress-bar">
              <div className="fill" style={{ width: '0%' }} />
            </div>
          </div>

          <div className="card card-span-2">
            <div className="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Estado de Agentes
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <div className="stat-value" id="activeAgents">47</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <div className="stat-label">Agentes Activos</div>
                </div>
                <div className="stat-sub">Asignados a campo</div>
              </div>
              <div className="metric-item">
                <div className="stat-value" id="onlineAgents">32</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                  <div className="stat-label">Agentes en Línea</div>
                </div>
                <div className="stat-sub"><span className="log-status online" />68% disponibilidad</div>
              </div>
            </div>
            <div className="data-row"><span className="label">En misión</span><span className="value cyan">23</span></div>
            <div className="data-row"><span className="label">En reposo</span><span className="value yellow">9</span></div>
            <div className="data-row"><span className="label">Sin señal</span><span className="value red">4</span></div>
          </div>

          <div className="card card-span-2">
            <div className="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="10" y1="12" x2="18" y2="12"></line><line x1="6" y1="16" x2="6" y2="16"></line><line x1="10" y1="16" x2="18" y2="16"></line></svg>
              Datos Procesados
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <div className="stat-value" id="dataProcessed">2.4</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                  <div className="stat-label">Total Procesado</div>
                </div>
                <div className="stat-sub">Terabytes</div>
              </div>
              <div className="metric-item">
                <div className="stat-value" id="dataToday">386</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <div className="stat-label">Hoy</div>
                </div>
                <div className="stat-sub">Gigabytes</div>
              </div>
            </div>
            <div className="spark" />
            <div className="data-row"><span className="label">WhatsApp interceptado</span><span className="value cyan">1.1 TB</span></div>
            <div className="data-row"><span className="label">SMS capturados</span><span className="value green">284 GB</span></div>
            <div className="data-row"><span className="label">Llamadas grabadas</span><span className="value yellow">520 GB</span></div>
            <div className="data-row"><span className="label">Telegram / Signal</span><span className="value red">156 GB</span></div>
            <div className="data-row"><span className="label">Metadatos de ubicación</span><span className="value" style={{ color: 'var(--neon-cyan)' }}>342 GB</span></div>
          </div>

          <div className="card card-span-2">
            <div className="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Señales de Inteligencia
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <div className="stat-value" id="signals">18</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  <div className="stat-label">Alertas Activas</div>
                </div>
                <div className="stat-sub"><span className="log-status online" />Todas monitoreadas</div>
              </div>
              <div className="metric-item">
                <div className="stat-value" id="priority" style={{ color: 'var(--red-accent)', background: 'none', WebkitTextFillColor: 'initial' }}>6</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red-accent)" strokeWidth="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <div className="stat-label" style={{ color: 'var(--red-accent)' }}>Prioridad Alta</div>
                </div>
                <div className="stat-sub"><span className="log-status pending" />Requiere atención</div>
              </div>
            </div>
            <div className="spark" />
            <div className="data-row"><span className="label">Comunicación cifrada detectada</span><span className="value cyan">8</span></div>
            <div className="data-row"><span className="label">Geolocalización sospechosa</span><span className="value red">4</span></div>
            <div className="data-row"><span className="label">Patrón de actividad anómala</span><span className="value yellow">6</span></div>
          </div>

          <div className="card card-full">
            <Suspense fallback={<div style={{padding: 20, color: '#fff'}}>Cargando Gráficos...</div>}><ChartsPanel logs={allBackendLogs} /></Suspense>
          </div>
          
          <div className="card card-full" style={{ padding: 0, overflow: 'hidden' }}>
            <Suspense fallback={<div style={{padding: 20, color: '#fff'}}>Cargando Mapa...</div>}><DeviceMap logs={allBackendLogs} /></Suspense>
          </div>

          <div className="card card-full" id="devicesCard">
            <div className="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
              Dispositivos Activos
              <span style={{ float: 'right', fontSize: '0.6rem', opacity: 0.5, letterSpacing: 1, fontWeight: 400 }}>
                {Object.keys(knownDevices).length > 0 ? 'EN LÍNEA' : 'SIN CONEXIÓN'}
              </span>
            </div>
            <div className="device-grid" id="deviceGrid">
              {renderDeviceChips()}
            </div>
          </div>

          <div className="card card-full" id="appsCard">
            <div className="card-title">Plataformas</div>
            <div id="appTabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 8 }}>
              <button
                className="app-tab"
                style={{
                  fontFamily: "'Orbitron', monospace", fontSize: '0.6rem', letterSpacing: '1px',
                  padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(179,0,255,0.3)',
                  background: activeAppFilter === 'all' ? 'rgba(179,0,255,0.2)' : 'rgba(179,0,255,0.08)',
                  color: '#f0e6ff', cursor: 'pointer',
                }}
                onClick={() => { setActiveAppFilter('all'); setDetailDevice(null); }}
              >
                Todos
              </button>
              {Array.from(new Set(sourceLogs.map(e => isReal ? (e as BackendLog).type || 'GENERAL' : (e as LogMsg).app || 'LOG'))).map(app => {
                const key = String(app).toLowerCase();
                const page = APP_PAGE_MAP[key];
                return (
                  <span key={app} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <button
                      style={{
                        fontFamily: "'Orbitron', monospace", fontSize: '0.6rem', letterSpacing: '1px',
                        padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(179,0,255,0.3)',
                        background: String(activeAppFilter).toLowerCase() === key ? 'rgba(179,0,255,0.2)' : 'rgba(179,0,255,0.08)',
                        color: '#f0e6ff', cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (page) window.location.href = `/${page}?app=${encodeURIComponent(app)}`;
                        else { setActiveAppFilter(app); setDetailDevice(null); }
                      }}
                    >
                      {app}
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="card card-full" id="logCard">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
                Registro de Actividad
              </span>
              <button 
                onClick={exportToCSV}
                disabled={isExporting}
                style={{
                  background: 'linear-gradient(135deg, #00f0ff, #00c0cc)', border: 'none', borderRadius: '6px',
                  color: '#000', fontFamily: "'Orbitron', monospace", fontSize: '0.7rem', padding: '6px 12px',
                  cursor: isExporting ? 'not-allowed' : 'pointer', opacity: isExporting ? 0.7 : 1,
                  boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
                }}
              >
                {isExporting ? '⏳ EXPORTANDO...' : '📥 EXPORTAR CSV'}
              </button>
            </div>

            {/* Búsqueda Avanzada */}
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>BUSCAR CONTACTO / MENSAJE</label>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej. Mi Reina, alerta..."
                  style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', fontSize: '0.8rem' }}
                />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>DESDE (FECHA)</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', fontSize: '0.8rem' }}
                  lang="es"
                />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>HASTA (FECHA)</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', fontSize: '0.8rem' }}
                  lang="es"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  onClick={handleSearch}
                  style={{
                    background: 'rgba(179, 0, 255, 0.2)', border: '1px solid rgba(179, 0, 255, 0.5)', borderRadius: '4px',
                    color: '#f0e6ff', padding: '8px 16px', cursor: 'pointer', height: '35px', fontSize: '0.8rem'
                  }}
                >
                  🔍 Buscar
                </button>
              </div>
            </div>

            {deviceIds.length > 0 && (
              <div className="device-filter-bar">
                <span className="device-filter-label">Filtrar por:</span>
                <span
                  className={`device-filter-tag${activeDeviceFilter === 'all' ? ' selected-filter' : ''}`}
                  onClick={() => setActiveDeviceFilter('all')}
                >
                  Todos
                </span>
                {deviceIds.map(devId => (
                  <span
                    key={devId}
                    className={`device-filter-tag${activeDeviceFilter === devId ? ' selected-filter' : ''}`}
                    onClick={() => setActiveDeviceFilter(devId)}
                  >
                    {knownDevices[devId].name || devId}
                  </span>
                ))}
              </div>
            )}

            <div className="app-filter-bar">
              <span className="device-filter-label">Aplicación:</span>
              <span
                className={`app-filter-tag${activeAppFilter === 'all' ? ' selected-filter' : ''}`}
                onClick={() => setActiveAppFilter('all')}
              >
                Todos
              </span>
              {Array.from(new Set(sourceLogs.map(e => isReal ? (e as BackendLog).type || 'GENERAL' : (e as LogMsg).app || 'LOG'))).map(a => (
                <span
                  key={a}
                  className={`app-filter-tag${String(activeAppFilter).toLowerCase() === String(a).toLowerCase() ? ' selected-filter' : ''}`}
                  onClick={() => {
                    const key = String(a).toLowerCase();
                    const page = APP_PAGE_MAP[key];
                    if (page) window.location.href = `/${page}?app=${encodeURIComponent(a)}`;
                    else setActiveAppFilter(a);
                  }}
                >
                  {a}
                </span>
              ))}
            </div>

            <div className="log-container" style={{ height: listHeight }}>
              {filteredLogsMemo.length === 0 ? (
                <div className="no-device-msg"><span>🔍</span>Sin registros para este filtro.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredLogsMemo.map((entry, index) => (
                      <div key={index}>
                        {renderLogEntry(entry, index)}
                      </div>
                    ))}
                  </div>
                  {hasMore && (
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        marginTop: '16px',
                        border: '1px solid rgba(179, 0, 255, 0.3)',
                        background: 'rgba(179, 0, 255, 0.1)',
                        color: '#f0e6ff',
                        fontFamily: "'Orbitron', monospace",
                        fontSize: '0.75rem',
                        letterSpacing: '1px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        opacity: isLoading ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.background = 'rgba(179, 0, 255, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(179, 0, 255, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(179, 0, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(179, 0, 255, 0.3)';
                      }}
                    >
                      {isLoading ? '⏳ Cargando más registros...' : `📥 Cargar más (${filteredLogsMemo.length} de ${totalCount || '?'})`}
                    </button>
                  )}
                  {!hasMore && filteredLogsMemo.length > 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '12px',
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontSize: '0.7rem',
                      fontFamily: "'Orbitron', monospace",
                    }}>
                      ✓ Mostrando todos los registros ({filteredLogsMemo.length})
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {detailDevice && detailDeviceInfo && (
        <DeviceDetailPanel
          detailDevice={detailDevice}
          detailDeviceInfo={detailDeviceInfo}
          allBackendLogs={allBackendLogs}
          detailTypeFilter={detailTypeFilter}
          setDetailDevice={setDetailDevice}
          setDetailTypeFilter={setDetailTypeFilter}
        />
      )}

      {/* Expanded message overlay */}
      {expandedIdx !== null && !isReal && (
        <ExpandedLogModal
          expandedIdx={expandedIdx}
          setExpandedIdx={setExpandedIdx}
        />
      )}

      
    </>
  );
}
