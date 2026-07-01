import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import AdminLogin from './AdminLogin';

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return <>{children}</>;
}
