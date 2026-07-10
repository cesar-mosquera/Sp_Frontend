import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
});
