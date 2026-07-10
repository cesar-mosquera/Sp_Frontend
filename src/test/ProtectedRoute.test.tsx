import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuthStore } from '../store';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false, token: null, role: null, username: null, deviceId: null });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra el login si no hay sesion iniciada', () => {
    render(
      <MemoryRouter>
        <ProtectedRoute><div>Contenido protegido</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText(/Acceso al Sistema/i)).toBeInTheDocument();
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('muestra el contenido si esta autenticado sin token (admin via master key, sin verificacion de sesion)', () => {
    useAuthStore.setState({ isAuthenticated: true, token: null, role: 'admin', username: 'admin', deviceId: null });
    render(
      <MemoryRouter>
        <ProtectedRoute><div>Contenido protegido</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('con token, verifica la sesion contra el backend y muestra el contenido si es valida', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    useAuthStore.setState({ isAuthenticated: true, token: 'tok-1', role: 'user', username: 'juan', deviceId: 'd1' });

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Contenido protegido</div></ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/Verificando sesión/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Contenido protegido')).toBeInTheDocument());
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('cierra la sesion si el backend responde 401 explicitamente', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('{}', { status: 401 }));
    useAuthStore.setState({ isAuthenticated: true, token: 'tok-expirado', role: 'user', username: 'juan', deviceId: 'd1' });

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Contenido protegido</div></ProtectedRoute>
      </MemoryRouter>
    );

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
  });

  it('NO cierra la sesion si la verificacion falla por un error de red (mantiene sesion local)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('Failed to fetch'));
    useAuthStore.setState({ isAuthenticated: true, token: 'tok-1', role: 'user', username: 'juan', deviceId: 'd1' });

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Contenido protegido</div></ProtectedRoute>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Contenido protegido')).toBeInTheDocument(), { timeout: 6000 });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('bloquea /admin para usuarios que no son admin', () => {
    useAuthStore.setState({ isAuthenticated: true, token: null, role: 'user', username: 'juan', deviceId: 'd1' });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute><div>Panel admin</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText(/Acceso Denegado/i)).toBeInTheDocument();
    expect(screen.queryByText('Panel admin')).not.toBeInTheDocument();
  });
});
