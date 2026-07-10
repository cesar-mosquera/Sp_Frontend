import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from '../pages/AdminPage';

describe('AdminPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra el estado vacio cuando no hay dispositivos enrolados', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ devices: [] }), { status: 200 })
    );

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Sin dispositivos enrolados/i)).toBeInTheDocument());
  });

  it('muestra un error de conexion si el backend no responde', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('Failed to fetch'));

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/No se pudo conectar al backend/i)).toBeInTheDocument(), { timeout: 6000 });
  }, 8000);

  it('lista los dispositivos devueltos por el backend', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({
        devices: [
          { device_id: 'device-1', name: 'Telefono de prueba', last_seen: new Date().toISOString() },
        ],
      }), { status: 200 })
    );

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Telefono de prueba')).toBeInTheDocument());
  });

  it('regresion: "Purgar Base de Datos" y "Registrar Dispositivo" son elementos distintos y localizables sin ambiguedad', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(JSON.stringify({ devices: [] }), { status: 200 }));

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('admin-open-register-device-modal')).toBeInTheDocument());

    const purgeButton = screen.getByTestId('admin-purge-database');
    const registerButton = screen.getByTestId('admin-open-register-device-modal');
    expect(purgeButton).not.toBe(registerButton);

    // Clic en el boton seguro (por data-testid, no por clase compartida) debe
    // abrir el modal de registro, sin llamar a la accion destructiva.
    fireEvent.click(registerButton);
    expect(await screen.findByText('Registrar Nuevo Dispositivo')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/admin/maintenance'), expect.anything());
  });
});
