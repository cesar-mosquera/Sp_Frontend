import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import Login from './Login';

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const role = useAuthStore(s => s.role);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Login />;
  }

  // Block non-admins from accessing /admin
  if (role !== 'admin' && location.pathname === '/admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0014', color: '#ff0055', fontFamily: 'monospace' }}>
        <h1>403 - Acceso Denegado</h1>
        <p style={{margin: '10px 0'}}>No tienes privilegios de administrador para ver esta página.</p>
        <button onClick={() => window.location.href = '/dashboard'} style={{padding: '10px 20px', background: '#ff0055', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold'}}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
