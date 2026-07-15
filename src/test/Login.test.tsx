import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../components/Login';
import { useAuthStore } from '../store';

describe('Login', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false, token: null, role: null, username: null, deviceId: null });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra un error si se intenta entrar sin usuario ni contraseña', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Acceder al Panel/i }));
    expect(await screen.findByText(/Ingresa usuario y contraseña/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('inicia sesion y actualiza el store cuando el backend responde exitosamente', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success', token: 'tok-123', username: 'juan', device_id: 'dev-1', role: 'user' }), { status: 200 })
    );

    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Usuario asignado/i), { target: { value: 'juan' } });
    fireEvent.change(screen.getByPlaceholderText(/Tu contraseña/i), { target: { value: 'secreta' } });
    fireEvent.click(screen.getByRole('button', { name: /Acceder al Panel/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
    expect(useAuthStore.getState().token).toBe('tok-123');
    expect(useAuthStore.getState().role).toBe('user');
  });

  it('muestra el mensaje de error del backend ante credenciales invalidas', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'error', detail: 'Credenciales invalidas' }), { status: 401 })
    );

    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Usuario asignado/i), { target: { value: 'juan' } });
    fireEvent.change(screen.getByPlaceholderText(/Tu contraseña/i), { target: { value: 'mala' } });
    fireEvent.click(screen.getByRole('button', { name: /Acceder al Panel/i }));

    expect(await screen.findByText('Credenciales invalidas')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('muestra un error de conexion si el fetch falla', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Usuario asignado/i), { target: { value: 'juan' } });
    fireEvent.change(screen.getByPlaceholderText(/Tu contraseña/i), { target: { value: 'secreta' } });
    fireEvent.click(screen.getByRole('button', { name: /Acceder al Panel/i }));

    expect(await screen.findByText(/Error de conexión con el servidor/i)).toBeInTheDocument();
  });

  it('regresion: en la ruta dedicada /login, tras loguear navega a /seleccion', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success', token: 'tok-123', username: 'juan', device_id: 'dev-1', role: 'user' }), { status: 200 })
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/seleccion" element={<div>Pantalla de Seleccion</div>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/Usuario asignado/i), { target: { value: 'juan' } });
    fireEvent.change(screen.getByPlaceholderText(/Tu contraseña/i), { target: { value: 'secreta' } });
    fireEvent.click(screen.getByRole('button', { name: /Acceder al Panel/i }));

    expect(await screen.findByText('Pantalla de Seleccion')).toBeInTheDocument();
  });

  it('regresion: si el formulario se muestra "en linea" sobre otra ruta (deep link sin sesion), no redirige a /seleccion y deja que esa misma ruta renderice su contenido', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success', token: 'tok-123', username: 'juan', device_id: 'dev-1', role: 'user' }), { status: 200 })
    );

    function DashboardStandIn() {
      // Simula lo que hace ProtectedRoute: mostrar <Login/> inline mientras
      // no hay sesion, y una vez logueado, mostrar el contenido real de esa
      // misma ruta (sin cambiar la URL).
      const isAuthenticated = useAuthStore(s => s.isAuthenticated);
      return isAuthenticated ? <div>Pantalla de Dashboard</div> : <Login />;
    }

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardStandIn />} />
          <Route path="/seleccion" element={<div>Pantalla de Seleccion</div>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/Usuario asignado/i), { target: { value: 'juan' } });
    fireEvent.change(screen.getByPlaceholderText(/Tu contraseña/i), { target: { value: 'secreta' } });
    fireEvent.click(screen.getByRole('button', { name: /Acceder al Panel/i }));

    // Debe quedarse en /dashboard (el destino original), no saltar a /seleccion.
    expect(await screen.findByText('Pantalla de Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla de Seleccion')).not.toBeInTheDocument();
  });
});
