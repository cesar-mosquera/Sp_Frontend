import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NotificationProvider from './components/NotificationProvider';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import DashboardSkeleton from './components/DashboardSkeleton';
import AdminSkeleton from './components/AdminSkeleton';
import { SSEProvider } from './contexts/SSEProvider';
import { useAuthStore } from './store';

const IndexPage = lazy(() => import('./pages/IndexPage'));
const SeleccionPage = lazy(() => import('./pages/SeleccionPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AppPage = lazy(() => import('./pages/AppPage'));

function LoginPage() {
  // Si ya hay sesion activa y alguien entra a /login (bookmark viejo, boton
  // atras, etc.), no tiene sentido mostrar el formulario de nuevo.
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/seleccion" replace />;
  return <Login />;
}

export default function App() {
  return (
    <SSEProvider>
      <NotificationProvider />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<IndexPage />} />
              <Route path="/seleccion" element={<Suspense fallback={<div style={{ minHeight: '100dvh', background: '#0a0014' }} />}><SeleccionPage /></Suspense>} />
              <Route path="/dashboard" element={<Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense>} />
              <Route path="/admin" element={<Suspense fallback={<AdminSkeleton />}><AdminPage /></Suspense>} />
              <Route path="/whatsapp" element={<AppPage appKey="whatsapp" />} />
              <Route path="/telegram" element={<AppPage appKey="telegram" />} />
              <Route path="/instagram" element={<AppPage appKey="instagram" />} />
              <Route path="/facebook" element={<AppPage appKey="facebook" />} />
              <Route path="/tiktok" element={<AppPage appKey="tiktok" />} />
              <Route path="/google" element={<AppPage appKey="google" />} />
              <Route path="/sms" element={<AppPage appKey="sms" />} />
              <Route path="/ubicacion" element={<AppPage appKey="ubicacion" />} />
              <Route path="/llamadas" element={<AppPage appKey="llamadas" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ProtectedRoute>
        } />
      </Routes>
    </SSEProvider>
  );
}
