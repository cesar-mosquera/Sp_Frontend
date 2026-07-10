import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import { SSEProvider } from '../contexts/SSEProvider';
import { useAuthStore } from '../store';

class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners: Record<string, ((ev: MessageEvent) => void)[]> = {};
  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }
  addEventListener(type: string, cb: (ev: MessageEvent) => void) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(cb);
  }
  close() {}
}

beforeAll(() => {
  (globalThis as unknown as { EventSource: unknown }).EventSource = MockEventSource;
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <SSEProvider>
        <DashboardPage />
      </SSEProvider>
    </MemoryRouter>
  );
}

describe('DashboardPage: flujo de datos', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true, token: null, role: 'admin', username: 'admin', deviceId: null });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('carga las estadisticas y los logs reales del backend', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard-data')) {
        return Promise.resolve(new Response(JSON.stringify({
          stats: { total_operations: 42, success_rate: 88.5 },
          total_count: 1,
          logs: [
            { id: '1', type: 'WHATSAPP', content: 'hola mundo', timestamp: '2026-07-09T10:00:00', device_id: 'device-1' },
          ],
        }), { status: 200 }));
      }
      if (url.includes('/devices')) {
        return Promise.resolve(new Response(JSON.stringify({ devices: [] }), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    renderDashboard();

    await waitFor(() => expect(screen.getByText('42').closest('.stat-value')).toBeTruthy());
    expect(screen.getAllByText('WHATSAPP').length).toBeGreaterThan(0);
    expect(screen.getByText('CONECTADO')).toBeInTheDocument();
  });

  it('muestra el estado de error de conexion cuando el backend falla', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('Failed to fetch'));

    renderDashboard();

    await waitFor(
      () => expect(screen.getByText(/No se pudo conectar al backend tras varios intentos/i)).toBeInTheDocument(),
      { timeout: 6000 }
    );
  }, 8000);

  it('tiene una barra de navegacion consistente con Seleccion y Admin (Canales/Dashboard/Admin)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ stats: { total_operations: 1 }, logs: [], devices: [] }), { status: 200 }))
    );

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <SSEProvider>
          <Routes>
            <Route path="/seleccion" element={<div>Pantalla de Seleccion</div>} />
            <Route path="/admin" element={<div>Pantalla de Admin</div>} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </SSEProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('CONECTADO')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /Canales/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Admin/i }));
    expect(await screen.findByText('Pantalla de Admin')).toBeInTheDocument();
  });
});
