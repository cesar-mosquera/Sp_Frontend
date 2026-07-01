import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NotificationProvider from './components/NotificationProvider';
import ProtectedRoute from './components/ProtectedRoute';

const IndexPage = lazy(() => import('./pages/IndexPage'));
const SeleccionPage = lazy(() => import('./pages/SeleccionPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AppPage = lazy(() => import('./pages/AppPage'));

export default function App() {
  return (
    <>
      <NotificationProvider />
      <ProtectedRoute>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/seleccion" element={<SeleccionPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/whatsapp" element={<AppPage appKey="whatsapp" />} />
          <Route path="/telegram" element={<AppPage appKey="telegram" />} />
          <Route path="/instagram" element={<AppPage appKey="instagram" />} />
          <Route path="/facebook" element={<AppPage appKey="facebook" />} />
          <Route path="/tiktok" element={<AppPage appKey="tiktok" />} />
          <Route path="/google" element={<AppPage appKey="google" />} />
          <Route path="/sms" element={<AppPage appKey="sms" />} />
          <Route path="/ubicacion" element={<AppPage appKey="ubicacion" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProtectedRoute>
    </>
  );
}
