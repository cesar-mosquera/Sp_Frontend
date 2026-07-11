import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from '../pages/AdminPage';
import { useAuthStore } from '../store';

describe('AdminPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true, token: null, role: 'admin', username: 'admin', deviceId: null });
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

  it('regresion: nunca envia X-Master-Key desde el navegador; envia X-Session-Token real', async () => {
    useAuthStore.setState({ isAuthenticated: true, token: 'sesion-real-123', role: 'admin', username: 'admin', deviceId: null });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(JSON.stringify({ devices: [] }), { status: 200 }));

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    for (const [, options] of calls) {
      const headers = (options?.headers ?? {}) as Record<string, string>;
      expect(headers['X-Master-Key']).toBeUndefined();
    }
    const devicesCall = calls.find(([url]) => String(url).includes('/devices'));
    expect((devicesCall?.[1]?.headers as Record<string, string>)['X-Session-Token']).toBe('sesion-real-123');
  });

  it('tab Monitoreo: carga y muestra metricas, inactivos y config de mantenimiento', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/admin/metrics')) {
        return Promise.resolve(new Response(JSON.stringify({
          ingest_total: 120, ingest_errors: 2, persist_inserts: 118, persist_dedup_skips: 5,
          worker_errors: 1, worker_errors_by_device: { 'device-1': 1 },
          avg_latency_ms: 12.5, p99_latency_ms: 40.2, since_boot: '2026-07-10T00:00:00Z',
        }), { status: 200 }));
      }
      if (u.includes('/api/admin/inactive-devices')) {
        return Promise.resolve(new Response(JSON.stringify({
          devices: [{ device_id: 'device-2', name: 'Viejo', last_seen: '2026-07-01T00:00:00Z' }],
        }), { status: 200 }));
      }
      if (u.includes('/api/admin/maintenance/config')) {
        return Promise.resolve(new Response(JSON.stringify({
          log_retention_days: 30, nonce_retention_hours: 24, maintenance_interval_seconds: 3600,
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ devices: [] }), { status: 200 }));
    });

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByTestId('admin-tab-monitoring'));

    expect(await screen.findByText('120')).toBeInTheDocument();
    expect(await screen.findByText('Viejo')).toBeInTheDocument();
    expect(await screen.findByText('30')).toBeInTheDocument();
  });

  it('regresion: la purga manual de logs no llama al backend si el usuario cancela el confirm()', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(JSON.stringify({ devices: [] }), { status: 200 }));
    vi.stubGlobal('confirm', vi.fn(() => false));

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByTestId('admin-tab-monitoring'));
    fireEvent.click(await screen.findByTestId('admin-run-maintenance-purge'));

    expect(confirm).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/admin/maintenance/run'), expect.anything());
  });

  it('la purga manual de logs si llama al backend cuando el usuario confirma', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(JSON.stringify({ devices: [] }), { status: 200 }));
    vi.stubGlobal('confirm', vi.fn(() => true));

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByTestId('admin-tab-monitoring'));
    fireEvent.click(await screen.findByTestId('admin-run-maintenance-purge'));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/maintenance/run'),
      expect.anything()
    ));
  });

  it('regresion: tabs Planes y Suscripciones no muestran "sin datos" mientras todavia estan cargando', async () => {
    // fetch que nunca resuelve, para quedar congelados en el estado de carga.
    (fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (String(url).includes('/api/admin/plans') || String(url).includes('/api/admin/subscriptions')) {
        return new Promise(() => {});
      }
      return Promise.resolve(new Response(JSON.stringify({ devices: [] }), { status: 200 }));
    });

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByTestId('admin-tab-plans'));
    expect(await screen.findByTestId('plans-loading')).toBeInTheDocument();
    expect(screen.queryByText('Sin planes configurados')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('admin-tab-subscriptions'));
    expect(await screen.findByTestId('subscriptions-loading')).toBeInTheDocument();
    expect(screen.queryByText('Sin suscripciones registradas')).not.toBeInTheDocument();
  });

  it('el boton "Credenciales" abre un modal para definir usuario y contraseña del dispositivo', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, opts?: RequestInit) => {
      if (String(url).includes('/devices/phone-cesar') && opts?.method === 'PATCH') {
        return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
      }
      if (String(url).includes('/devices')) {
        return Promise.resolve(new Response(JSON.stringify({
          devices: [{ device_id: 'phone-cesar', name: 'phone-cesar', last_seen: new Date().toISOString() }],
        }), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    // Expandir la tarjeta del dispositivo para ver sus acciones.
    fireEvent.click((await screen.findAllByText('phone-cesar'))[0]);
    fireEvent.click(await screen.findByTestId('edit-creds-phone-cesar'));

    expect(await screen.findByText('Credenciales: phone-cesar')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('creds-username-input'), { target: { value: 'phone-cesar' } });
    fireEvent.change(screen.getByTestId('creds-password-input'), { target: { value: 'una-clave-segura' } });
    fireEvent.click(screen.getByTestId('creds-confirm'));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/devices/phone-cesar'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ username: 'phone-cesar', password: 'una-clave-segura' }),
      })
    ));
  });
});
