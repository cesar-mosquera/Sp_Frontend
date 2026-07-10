import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, DASHBOARD_KEY } from '../config';
import { useAuthStore } from '../store';
import '../styles/admin.css';

// Types para Planes y Suscripciones
interface Plan {
  app_name: string;
  display_name?: string;
  price: number;
  enabled: boolean;
}

interface Subscription {
  id: number;
  device_id: string;
  app_name: string;
  display_name?: string;
  active: boolean;
  expires_at?: string;
}

interface Device {
  device_id: string;
  name?: string;
  last_seen: string;
  created_at?: string;
  api_key?: string;
  aes_key?: string;
  username?: string;
  password?: string;
  battery_level?: number;
  is_charging?: boolean;
  accessibility_enabled?: number;
  notif_access_enabled?: number;
  doze_enabled?: number;
  storage_free_mb?: number;
}

interface Creds {
  username: string;
  password: string;
}

function generateCredential(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const special = '!@#$%^&*';
  let pass = '';
  for (let i = 0; i < 16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  pass += special.charAt(Math.floor(Math.random() * special.length));
  return pass;
}

// Eliminamos getDeviceCredentials mock
// function getDeviceCredentials(deviceId: string): Creds { ... }

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Ahora';
  const min = Math.floor(sec / 60);
  if (min < 60) return `Hace ${min}min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return date.toLocaleDateString();
}

export default function AdminPage() {
  const navigate = useNavigate();
  const logout = useAuthStore(s => s.logout);
  const [devices, setDevices] = useState<Device[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [toastMsg, setToastMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubsModal, setShowSubsModal] = useState(false);
  
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [editDeviceName, setEditDeviceName] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Nuevos estados para Tabs, Planes y Suscripciones
  const [adminTab, setAdminTab] = useState<'devices' | 'subscriptions' | 'plans'>('devices');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [globalSubs, setGlobalSubs] = useState<Subscription[]>([]);
  const [deviceSubs, setDeviceSubs] = useState<Subscription[]>([]);

  const API = API_BASE_URL || '';

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  const updateStatusTime = () => {
    const el = document.getElementById('statusTime');
    if (el) {
      const now = new Date();
      el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  };

  useEffect(() => {
    updateStatusTime();
    const interval = setInterval(updateStatusTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setConnectionError(null);
    try {
      const res = await fetch(API + '/devices', {
        headers: { 'X-Master-Key': DASHBOARD_KEY, 'X-Dashboard-Key': DASHBOARD_KEY },
      });
      if (!res.ok) {
        setConnectionError(`Error ${res.status}: No se pudo cargar dispositivos`);
        setDevices([]);
        return;
      }
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error('Error cargando dispositivos:', err);
      setConnectionError('No se pudo conectar al backend');
      setDevices([]);
    }
    setLoading(false);
  }, [API]);

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch(API + '/api/admin/plans', {
        headers: { 'X-Master-Key': DASHBOARD_KEY, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Error cargando planes:', err);
    }
  }, [API]);

  const loadSubscriptions = useCallback(async () => {
    try {
      const res = await fetch(API + '/api/admin/subscriptions', {
        headers: { 'X-Master-Key': DASHBOARD_KEY, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalSubs(data.subscriptions || []);
      }
    } catch (err) {
      console.error('Error cargando suscripciones:', err);
    }
  }, [API]);

  useEffect(() => {
    if (adminTab === 'plans') loadPlans();
    if (adminTab === 'subscriptions') loadSubscriptions();
  }, [adminTab, loadPlans, loadSubscriptions]);

  const handleLogout = () => {
    logout();
    setDevices([]);
  };

  const toggleDevice = (idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copiado al portapapeles');
    } catch (e) { console.warn('Error copying to clipboard:', e); }
  };

  const copyAllCreds = async (idx: number) => {
    const d = devices[idx];
    const text = `Usuario: ${d.username || '-'}\nContraseña: ${d.password || '-'}\nDevice ID: ${d.device_id}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Credenciales copiadas');
    } catch (e) { console.warn('Error copying all creds:', e); }
  };

  const resetCreds = async (idx: number) => {
    const d = devices[idx];
    setIsActionLoading(true);
    try {
      const res = await fetch(API + '/api/rotate-key', {
        method: 'POST',
        headers: { 
          'X-Master-Key': DASHBOARD_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_id: d.device_id, days: 365 }),
      });
      if (res.ok) {
        const data = await res.json();
        // Actualizar dispositivo con nuevas claves
        setDevices(prev => prev.map(dev => 
          dev.device_id === d.device_id 
            ? { ...dev, api_key: data.new_api_key, aes_key: data.new_aes_key }
            : dev
        ));
        showToast('Claves rotadas exitosamente');
      } else {
        showToast('Error al rotar claves');
      }
    } catch (err) {
      console.error('Error rotando claves:', err);
      showToast('Error de conexión');
    } finally {
      setIsActionLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const registerDevice = async () => {
    if (!newDeviceId.trim()) {
      showToast('El ID del dispositivo es requerido');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(newDeviceId)) {
      showToast('Solo letras, números, guiones y guiones bajos');
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await fetch(API + '/register_device', {
        method: 'POST',
        headers: { 
          'X-Master-Key': DASHBOARD_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          device_id: newDeviceId.trim(),
          name: newDeviceName.trim() || newDeviceId.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await loadDevices();
        setShowRegisterModal(false);
        setNewDeviceId('');
        setNewDeviceName('');
        showToast('Dispositivo registrado exitosamente');
      } else {
        const error = await res.json();
        showToast(error.detail || 'Error al registrar dispositivo');
      }
    } catch (err) {
      console.error('Error registrando dispositivo:', err);
      showToast('Error de conexión');
    } finally {
      setIsActionLoading(false);
    }
  };

  const deleteDevice = async () => {
    if (!selectedDevice) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(API + `/devices/${selectedDevice.device_id}`, {
        method: 'DELETE',
        headers: { 
          'X-Master-Key': DASHBOARD_KEY,
          'X-Dashboard-Key': DASHBOARD_KEY,
        },
      });
      if (res.ok) {
        await loadDevices();
        setShowDeleteModal(false);
        setSelectedDevice(null);
        showToast('Dispositivo eliminado');
      } else {
        showToast('Error al eliminar dispositivo');
      }
    } catch (err) {
      console.error('Error eliminando dispositivo:', err);
      showToast('Error de conexión');
    } finally {
      setIsActionLoading(false);
    }
  };

  const updateDeviceName = async () => {
    if (!selectedDevice || !editDeviceName.trim()) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(API + `/devices/${selectedDevice.device_id}`, {
        method: 'PATCH',
        headers: { 
          'X-Master-Key': DASHBOARD_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editDeviceName.trim() }),
      });
      if (res.ok) {
        await loadDevices();
        setShowEditModal(false);
        setSelectedDevice(null);
        setEditDeviceName('');
        showToast('Nombre actualizado');
      } else {
        showToast('Error al actualizar nombre');
      }
    } catch (err) {
      console.error('Error actualizando nombre:', err);
      showToast('Error de conexión');
    } finally {
      setIsActionLoading(false);
    }
  };

  const runMaintenance = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(API + `/api/admin/maintenance`, {
        method: 'POST',
        headers: { 'X-Master-Key': DASHBOARD_KEY }
      });
      if (res.ok) showToast('Mantenimiento DB ejecutado');
      else showToast('Error al limpiar DB');
    } catch { showToast('Error de conexión'); }
    setIsActionLoading(false);
  };

  const clearBans = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(API + `/api/admin/clear-bans`, {
        method: 'POST',
        headers: { 'X-Master-Key': DASHBOARD_KEY }
      });
      if (res.ok) showToast('Baneos de IP levantados');
      else showToast('Error al limpiar baneos');
    } catch { showToast('Error de conexión'); }
    setIsActionLoading(false);
  };

  const sendCommand = async (deviceId: string, cmd: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch(API + `/api/admin/command`, {
        method: 'POST',
        headers: { 'X-Master-Key': DASHBOARD_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, command: cmd, params: {} })
      });
      if (res.ok) showToast(`Comando ${cmd} enviado`);
      else showToast('Error al enviar comando');
    } catch { showToast('Error de conexión'); }
    setIsActionLoading(false);
  };

  const openDeleteModal = (device: Device) => {
    setSelectedDevice(device);
    setShowDeleteModal(true);
  };

  const openEditModal = (device: Device) => {
    setSelectedDevice(device);
    setEditDeviceName(device.name || device.device_id);
    setShowEditModal(true);
  };

  const openSubsModal = async (device: Device) => {
    setSelectedDevice(device);
    setShowSubsModal(true);
    try {
      const res = await fetch(API + `/api/admin/devices/${device.device_id}/subscriptions`, {
        headers: { 'X-Master-Key': DASHBOARD_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        setDeviceSubs(data.subscriptions || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Error cargando suscripciones');
    }
  };

  const toggleSubscription = async (appName: string, active: boolean) => {
    if (!selectedDevice) return;
    try {
      const res = await fetch(API + `/api/admin/devices/${selectedDevice.device_id}/subscriptions?app_name=${encodeURIComponent(appName)}&active=${active}`, {
        method: 'POST',
        headers: { 'X-Master-Key': DASHBOARD_KEY },
      });
      if (res.ok) {
        setDeviceSubs(prev => prev.map(s => s.app_name === appName ? { ...s, active } : s));
        showToast(`Suscripción ${active ? 'activada' : 'desactivada'}`);
        if (adminTab === 'subscriptions') loadSubscriptions();
      }
    } catch (err) {
      showToast('Error al actualizar suscripción');
    }
  };

  const togglePlanState = async (appName: string, currentEnabled: boolean) => {
    try {
      const method = currentEnabled ? 'DELETE' : 'PUT';
      const body = currentEnabled ? undefined : JSON.stringify({ enabled: true });
      const res = await fetch(API + `/api/admin/plans/${encodeURIComponent(appName)}`, {
        method,
        headers: { 'X-Master-Key': DASHBOARD_KEY, 'Content-Type': 'application/json' },
        body
      });
      if (res.ok) {
        showToast(`Plan ${currentEnabled ? 'desactivado' : 'activado'}`);
        loadPlans();
      }
    } catch (err) {
      showToast('Error al actualizar plan');
    }
  };

  const savePlanPrice = async (appName: string, displayName: string, price: number) => {
    try {
      const res = await fetch(API + `/api/admin/plans/${encodeURIComponent(appName)}`, {
        method: 'PUT',
        headers: { 'X-Master-Key': DASHBOARD_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ price, display_name: displayName })
      });
      if (res.ok) {
        showToast('Precio guardado');
        loadPlans();
      } else {
        showToast('Error al guardar precio');
      }
    } catch (err) {
      showToast('Error de conexión');
    }
  };


  const now = new Date();
  const online = devices.filter(d => (now.getTime() - new Date(d.last_seen).getTime()) < 60000);
  
  const filteredDevices = devices.filter(d => 
    d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.name && d.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <div id="toast" className={`toast${toastMsg ? ' show' : ''}`}>{toastMsg || 'Copiado'}</div>

      <div id="adminScreen" className="screen active">
          <div className="status-bar">
            <span className="time" id="statusTime">9:41</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>🛡 Admin</span>
            </div>
          </div>

          <div className="admin-header">
            <h1>Administración</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a
                href={`${API_BASE_URL}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="logout-btn"
                style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(0,240,255,0.2)' }}
              >
                📖 API Docs
              </a>
              <button className="logout-btn" id="logoutBtn" onClick={handleLogout}>
                Salir
              </button>
            </div>
          </div>
          
          <div className="admin-tabs">
            <button className={`admin-tab-btn ${adminTab === 'devices' ? 'active' : ''}`} onClick={() => setAdminTab('devices')}>
              📱 Dispositivos
            </button>
            <button className={`admin-tab-btn ${adminTab === 'subscriptions' ? 'active' : ''}`} onClick={() => setAdminTab('subscriptions')}>
              📋 Suscripciones
            </button>
            <button className={`admin-tab-btn ${adminTab === 'plans' ? 'active' : ''}`} onClick={() => setAdminTab('plans')}>
              💰 Planes
            </button>
          </div>

          {adminTab === 'devices' && (
            <>
          <div className="stats-row" id="statsRow">
            <div className="stat-card">
              <div className="num">{devices.length}</div>
              <div className="label">Dispositivos</div>
            </div>
            <div className="stat-card">
              <div className="num">{online.length}</div>
              <div className="label">En línea</div>
            </div>
            <div className="stat-card">
              <div className="num">{devices.length}</div>
              <div className="label">Credenciales</div>
            </div>
            <div className="stat-card">
              <div className="num">
                {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
              </div>
              <div className="label">Última sinc.</div>
            </div>
          </div>

          <div className="section-label">
            Herramientas de Superusuario
          </div>
          <div style={{ display: 'flex', gap: '12px', padding: '0 20px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button className="btn-primary-small" onClick={runMaintenance} disabled={isActionLoading} style={{ background: 'rgba(255, 100, 0, 0.2)', color: '#ff8800', borderColor: 'rgba(255, 100, 0, 0.4)' }}>
              🧹 Purgar Base de Datos
            </button>
            <button className="btn-primary-small" onClick={clearBans} disabled={isActionLoading} style={{ background: 'rgba(0, 255, 100, 0.2)', color: '#00ff66', borderColor: 'rgba(0, 255, 100, 0.4)' }}>
              🔓 Limpiar Baneos IP
            </button>
          </div>

          <div className="section-label">
            Dispositivos enrolados
            {connectionError && <span style={{ fontSize: '0.7rem', color: '#ff0033', marginLeft: 8 }}>⚠️ {connectionError}</span>}
            <button 
              onClick={() => setShowRegisterModal(true)}
              className="btn-primary-small"
              style={{ marginLeft: 'auto' }}
            >
              + Registrar Dispositivo
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="🔍 Buscar por ID o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div id="deviceListContainer">
            {loading ? (
              <div className="loading-spinner"><div className="spinner" /></div>
            ) : filteredDevices.length === 0 && searchQuery ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No se encontraron dispositivos</h3>
                <p>Intenta con otro término de búsqueda.</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📡</div>
                <h3>Sin dispositivos enrolados</h3>
                <p>Usa el botón "Registrar Dispositivo" para agregar uno nuevo.</p>
              </div>
            ) : (
              <div className="device-list">
                {filteredDevices.map((d, i) => {
                  const lastSeen = new Date(d.last_seen);
                  const isOnline = (now.getTime() - lastSeen.getTime()) < 60000;
                  const isExpanded = expanded.has(i);

                  return (
                    <div key={d.device_id} className={`device-card${isExpanded ? ' expanded' : ''}`}>
                      <div className="device-card-header" onClick={() => toggleDevice(i)}>
                        <div className={`device-status-dot ${isOnline ? 'online' : 'offline'}`} />
                        <div className="device-info">
                          <div className="name">{d.name || 'Sin nombre'}</div>
                          <div className="meta">{d.device_id} · {getTimeAgo(lastSeen)}</div>
                        </div>
                        <span className={`device-chevron${isExpanded ? ' open' : ''}`}>▼</span>
                      </div>
                      <div className="device-detail">
                        <div className="cred-row">
                          <span className="cred-label">Usuario</span>
                          <span className="cred-value">
                            {d.username || '-'}
                            <button className="copy-btn" onClick={e => { e.stopPropagation(); if (d.username) copyText(d.username); }}>Copiar</button>
                          </span>
                        </div>
                        <div className="cred-row">
                          <span className="cred-label">Contraseña</span>
                          <span className="cred-value">
                            <span style={{ fontFamily: "'Inter',monospace", fontSize: '0.7rem', letterSpacing: '0.5px', color: '#fff' }}>
                              {d.password || '-'}
                            </span>
                            <button className="copy-btn" onClick={e => { e.stopPropagation(); if (d.password) copyText(d.password); }}>Copiar</button>
                          </span>
                        </div>
                        <div className="cred-row">
                          <span className="cred-label">Device ID</span>
                          <span className="cred-value" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                            {d.device_id}
                          </span>
                        </div>
                        <div className="cred-row">
                          <span className="cred-label">Registro</span>
                          <span className="cred-value" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                            {d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Desconocido'}
                          </span>
                        </div>
                        
                        
                        <div style={{ marginTop: 16, marginBottom: 8, fontSize: '0.8rem', color: '#ff0055', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Salud del Agente (Telemetría)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Batería:</span>
                            <span style={{ color: (d.battery_level ?? 0) > 20 ? '#00ff66' : '#ff3333' }}>
                              {d.battery_level !== undefined && d.battery_level !== -1 ? `${d.battery_level}% ${d.is_charging ? '⚡' : ''}` : 'Desconocido'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Accesibilidad:</span>
                            <span>{d.accessibility_enabled === 1 ? '🟢 Activo' : '🔴 Inactivo'}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Notificaciones:</span>
                            <span>{d.notif_access_enabled === 1 ? '🟢 Activo' : '🔴 Inactivo'}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Modo Doze (Ahorro):</span>
                            <span>{d.doze_enabled === 1 ? '🔴 Asfixiado' : '🟢 Libre'}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', gridColumn: '1 / -1' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Almacenamiento Libre:</span>
                            <span>{d.storage_free_mb !== -1 ? `${d.storage_free_mb} MB` : 'Desconocido'}</span>
                          </div>
                        </div>

                        <div style={{ marginTop: 16, marginBottom: 8, fontSize: '0.8rem', color: '#00f0ff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Comandos Remotos (Resolución de Problemas)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
                          <button className="action-btn" onClick={e => { e.stopPropagation(); sendCommand(d.device_id, 'restart'); }} style={{ background: 'rgba(255,255,255,0.05)', justifyContent: 'center' }}>🔄 Reiniciar</button>
                          <button className="action-btn" onClick={e => { e.stopPropagation(); sendCommand(d.device_id, 'collect_data'); }} style={{ background: 'rgba(255,255,255,0.05)', justifyContent: 'center' }}>📥 Sincronizar</button>
                          <button className="action-btn" onClick={e => { e.stopPropagation(); sendCommand(d.device_id, 'update_config'); }} style={{ background: 'rgba(255,255,255,0.05)', justifyContent: 'center' }}>⚙️ Conf</button>
                          <button className="action-btn" onClick={e => { e.stopPropagation(); sendCommand(d.device_id, 'nag_permissions'); }} style={{ background: 'rgba(255,255,0,0.1)', color: '#ffcc00', borderColor: 'rgba(255,255,0,0.3)', justifyContent: 'center' }} title="Fuerza al usuario a activar accesibilidad">🛡️ Forzar Permisos</button>
                          <button className="action-btn" onClick={e => { e.stopPropagation(); sendCommand(d.device_id, 'clear_cache'); }} style={{ background: 'rgba(255,100,0,0.1)', color: '#ff8800', borderColor: 'rgba(255,100,0,0.3)', justifyContent: 'center' }} title="Borra caché local del APK corrompida">🧹 Limpiar Caché</button>
                          <button className="action-btn" onClick={e => { e.stopPropagation(); if(confirm('¿SEGURO? Esto borrará el APK del teléfono sin dejar rastro.')) sendCommand(d.device_id, 'self_destruct'); }} style={{ background: 'rgba(255,0,0,0.2)', color: '#ff0033', borderColor: 'rgba(255,0,0,0.5)', justifyContent: 'center' }} title="Desinstala y borra el APK del teléfono">☢️ SELF DESTRUCT</button>
                        </div>
                        <div className="device-actions">
                          <button className="action-btn btn-copy-all" onClick={e => { e.stopPropagation(); copyAllCreds(i); }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            Credenciales
                          </button>
                          <button className="action-btn btn-outline" onClick={e => { e.stopPropagation(); openSubsModal(d); }}>
                            📋 Suscripciones
                          </button>
                          <button className="action-btn btn-edit" onClick={e => { e.stopPropagation(); openEditModal(d); }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Editar
                          </button>
                          <button className="action-btn btn-reset" onClick={e => { e.stopPropagation(); resetCreds(i); }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Regenerar
                          </button>
                          <button className="action-btn btn-delete" onClick={e => { e.stopPropagation(); openDeleteModal(d); }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </>
          )}

          {adminTab === 'subscriptions' && (
            <div className="device-list" style={{ marginTop: 0 }}>
              {globalSubs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h3>Sin suscripciones registradas</h3>
                </div>
              ) : (
                <div className="device-card expanded">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Dispositivo</th>
                        <th>Aplicación</th>
                        <th>Estado</th>
                        <th>Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalSubs.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{s.device_id}</td>
                          <td style={{ fontWeight: 600 }}>{s.app_name}</td>
                          <td>
                            <span className={`status-badge-sm ${s.active ? 'active' : 'inactive'}`}>
                              {s.active ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                            {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {adminTab === 'plans' && (
            <div className="device-list" style={{ marginTop: 0 }}>
              {plans.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💰</div>
                  <h3>Sin planes configurados</h3>
                </div>
              ) : (
                <div className="device-card expanded">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>App</th>
                        <th>Nombre / Promoción</th>
                        <th>Precio ($)</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{p.app_name}</td>
                          <td style={{ fontSize: '0.85rem' }}>{p.display_name || p.app_name}</td>
                          <td>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0"
                              defaultValue={p.price || 0}
                              className="modal-input"
                              style={{ width: '100px', marginBottom: 0, padding: '8px 12px' }}
                              id={`price_input_${p.app_name}`}
                            />
                          </td>
                          <td>
                            <span className={`status-badge-sm ${p.enabled ? 'active' : 'inactive'}`}>
                              {p.enabled ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: 8 }}>
                            <button 
                              className="btn-primary-small" 
                              onClick={() => {
                                const val = (document.getElementById(`price_input_${p.app_name}`) as HTMLInputElement)?.value;
                                savePlanPrice(p.app_name, p.display_name || p.app_name, parseFloat(val || '0'));
                              }}
                            >
                              Guardar
                            </button>
                            <button 
                              className="btn-primary-small"
                              style={{ background: p.enabled ? 'rgba(255, 0, 51, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: p.enabled ? '#ff0033' : '#fff' }}
                              onClick={() => togglePlanState(p.app_name, p.enabled)}
                            >
                              {p.enabled ? 'Desactivar' : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      {/* Modal de Registro de Dispositivo */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Registrar Nuevo Dispositivo</h2>
            <div style={{ marginBottom: '16px' }}>
              <label className="modal-label">ID del Dispositivo *</label>
              <input
                type="text"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                placeholder="ej: device-001"
                className="modal-input"
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label className="modal-label">Nombre (opcional)</label>
              <input
                type="text"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="ej: iPhone de Juan"
                className="modal-input"
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => { setShowRegisterModal(false); setNewDeviceId(''); setNewDeviceName(''); }}
                disabled={isActionLoading}
                className="modal-btn modal-btn-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={registerDevice}
                disabled={isActionLoading}
                className="modal-btn modal-btn-primary"
              >
                {isActionLoading ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eliminar Dispositivo */}
      {showDeleteModal && selectedDevice && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content danger" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '16px' }}>⚠️</div>
            <h2 className="modal-title">Eliminar Dispositivo</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', marginBottom: '8px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
              ¿Estás seguro de eliminar el dispositivo?
            </p>
            <p style={{ color: '#00f0ff', fontSize: '1rem', marginBottom: '24px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }}>
              {selectedDevice.name || selectedDevice.device_id}
            </p>
            <p style={{ color: 'rgba(255, 0, 51, 0.8)', fontSize: '0.85rem', marginBottom: '24px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
              Esta acción no se puede deshacer. El dispositivo perderá acceso al sistema.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedDevice(null); }}
                disabled={isActionLoading}
                className="modal-btn modal-btn-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={deleteDevice}
                disabled={isActionLoading}
                className="modal-btn modal-btn-danger"
              >
                {isActionLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Nombre */}
      {showEditModal && selectedDevice && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Editar Nombre</h2>
            <div style={{ marginBottom: '24px' }}>
              <label className="modal-label">Nuevo nombre</label>
              <input
                type="text"
                value={editDeviceName}
                onChange={(e) => setEditDeviceName(e.target.value)}
                placeholder="ej: iPhone de Juan"
                className="modal-input"
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => { setShowEditModal(false); setSelectedDevice(null); setEditDeviceName(''); }}
                disabled={isActionLoading}
                className="modal-btn modal-btn-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={updateDeviceName}
                disabled={isActionLoading}
                className="modal-btn modal-btn-primary"
              >
                {isActionLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Suscripciones */}
      {showSubsModal && selectedDevice && (
        <div className="modal-overlay" onClick={() => setShowSubsModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Suscripciones: {selectedDevice.name || selectedDevice.device_id}</h2>
            {deviceSubs.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>Sin suscripciones</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>App</th>
                    <th>Estado</th>
                    <th>Vencimiento</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceSubs.map((s, i) => (
                    <tr key={i}>
                      <td>{s.display_name || s.app_name}</td>
                      <td>
                        <span className={`status-badge-sm ${s.active ? 'active' : 'inactive'}`}>
                          {s.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        <button 
                          className="btn-primary-small"
                          style={{ background: s.active ? 'rgba(255, 0, 51, 0.2)' : 'rgba(0, 240, 255, 0.2)', color: s.active ? '#ff0033' : '#00f0ff' }}
                          onClick={() => toggleSubscription(s.app_name, !s.active)}
                        >
                          {s.active ? 'Revocar' : 'Otorgar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button onClick={() => setShowSubsModal(false)} className="modal-btn modal-btn-cancel">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="tab-bar">
        <button className="tab-item" onClick={() => navigate('/seleccion')}>
          <span className="tab-icon">🛡</span>
          Canales
        </button>
        <button className="tab-item" onClick={() => navigate('/dashboard')}>
          <span className="tab-icon">👁️</span>
          Dashboard
        </button>
        <button className="tab-item active" onClick={() => navigate('/admin')}>
          <span className="tab-icon">⚙️</span>
          Admin
        </button>
      </div>
    </>
  );
}
