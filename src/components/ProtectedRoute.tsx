import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { API_BASE_URL } from '../config';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { handleAuthResponse } from '../utils/authResponse';
import Login from './Login';

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);
  const loginAsUser = useAuthStore(s => s.loginAsUser);
  const location = useLocation();
  const [checking, setChecking] = useState(isAuthenticated && !!token);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const controller = new AbortController();
    fetchWithRetry(`${API_BASE_URL}/api/session`, {
      signal: controller.signal,
      headers: { 'X-Session-Token': token },
      timeoutMs: 4000,
      retries: 1,
      retryDelayMs: 400,
    })
      .then(handleAuthResponse)
      .then(async (res) => {
        if (cancelled || !res.ok) return;
        try {
          const data = await res.json();
          if (data.status === 'success') {
            const serverRole: 'admin' | 'user' = data.role === 'admin' ? 'admin' : 'user';
            const serverUsername = data.username || '';
            const serverDeviceId = data.device_id || null;
            // Actualizar store si el caché local está desactualizado
            if (serverRole !== role || serverUsername !== useAuthStore.getState().username || serverDeviceId !== useAuthStore.getState().deviceId) {
              loginAsUser(token, serverUsername, serverDeviceId, serverRole);
            }
          }
        } catch { /* ignore parse errors */ }
      })
      .catch(e => { console.warn('No se pudo verificar la sesión tras varios intentos (se mantiene la sesión local):', e); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; controller.abort(); };
  }, []);

  if (!isAuthenticated) {
    return <Login />;
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0014', color: '#a580c7', fontFamily: 'monospace' }}>
        Verificando sesión...
      </div>
    );
  }

  // Block non-admins from accessing /admin or /dashboard
  if (role !== 'admin' && (location.pathname === '/admin' || location.pathname === '/dashboard')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0014', color: '#ff0055', fontFamily: 'monospace' }}>
        <h1>403 - Acceso Denegado</h1>
        <p style={{margin: '10px 0'}}>No tienes privilegios para ver esta página.</p>
        <button onClick={() => window.location.href = '/seleccion'} style={{padding: '10px 20px', background: '#00ff88', color: '#0a0014', border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', marginTop: 8}}>
          Volver a Canales
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
