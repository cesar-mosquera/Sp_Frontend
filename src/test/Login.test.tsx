import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /Acceder al Panel/i }));
    expect(await screen.findByText(/Ingresa usuario y contraseña/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('inicia sesion y actualiza el store cuando el backend responde exitosamente', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success', token: 'tok-123', username: 'juan', device_id: 'dev-1', role: 'user' }), { status: 200 })
    );

    render(<Login />);
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

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/Usuario asignado/i), { target: { value: 'juan' } });
    fireEvent.change(screen.getByPlaceholderText(/Tu contraseña/i), { target: { value: 'mala' } });
    fireEvent.click(screen.getByRole('button', { name: /Acceder al Panel/i }));

    expect(await screen.findByText('Credenciales invalidas')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('muestra un error de conexion si el fetch falla', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/Usuario asignado/i), { target: { value: 'juan' } });
    fireEvent.change(screen.getByPlaceholderText(/Tu contraseña/i), { target: { value: 'secreta' } });
    fireEvent.click(screen.getByRole('button', { name: /Acceder al Panel/i }));

    expect(await screen.findByText(/Error de conexión con el servidor/i)).toBeInTheDocument();
  });
});
