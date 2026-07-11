import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppPage from '../pages/AppPage';
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

function renderAppPage() {
  return render(
    <MemoryRouter initialEntries={['/whatsapp']}>
      <SSEProvider>
        <AppPage appKey="whatsapp" />
      </SSEProvider>
    </MemoryRouter>
  );
}

describe('AppPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true, token: null, role: 'admin', username: 'admin', deviceId: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('regresion: mientras carga no muestra a la vez "cargando" y "no se encontraron mensajes"', async () => {
    // fetch que nunca resuelve, para quedar congelados en el estado de carga inicial.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    renderAppPage();

    await waitFor(() => expect(screen.getByTestId('app-list-loading')).toBeInTheDocument());
    // Antes, filtered.length === 0 mostraba el empty-state de "sin resultados"
    // incluso mientras isLoading seguia en true, mostrando dos mensajes
    // contradictorios (cargando + sin resultados) al mismo tiempo.
    expect(screen.queryByText('No se encontraron mensajes que coincidan.')).not.toBeInTheDocument();
  });

  it('muestra "no se encontraron conversaciones" solo despues de terminar de cargar sin resultados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ logs: [] }), { status: 200 }))
    ));

    renderAppPage();

    await waitFor(() => expect(screen.getByText('No se encontraron conversaciones que coincidan.')).toBeInTheDocument());
    expect(screen.queryByTestId('app-list-loading')).not.toBeInTheDocument();
  });

  it('agrupa los mensajes por contacto en conversaciones separadas, sin mezclarlas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/dashboard-data')) {
        return Promise.resolve(new Response(JSON.stringify({
          logs: [
            { id: '1', type: 'WHATSAPP', content: 'hola', timestamp: '2026-07-10T09:00:00', contact: 'Mi Reina', direction: 'in', device_id: 'device-1' },
            { id: '2', type: 'WHATSAPP', content: 'como estas', timestamp: '2026-07-10T09:01:00', contact: 'Mi Reina', direction: 'out', device_id: 'device-1' },
            { id: '3', type: 'WHATSAPP', content: 'todo bien por aca', timestamp: '2026-07-10T09:02:00', contact: 'El Enlace', direction: 'in', device_id: 'device-1' },
          ],
        }), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    }));

    renderAppPage();

    // Regresion: dos conversaciones separadas (una por contacto), no 3
    // mensajes sueltos mezclados en un solo feed.
    await waitFor(() => expect(screen.getByTestId('open-conversation-mi-reina')).toBeInTheDocument());
    expect(screen.getByTestId('open-conversation-el-enlace')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('2 conversaciones')).toBeInTheDocument());

    // Al entrar a la conversacion de "Mi Reina", solo se ven sus 2 mensajes;
    // el mensaje de "El Enlace" (un tercer contacto) no debe aparecer mezclado.
    fireEvent.click(screen.getByTestId('open-conversation-mi-reina'));

    expect(await screen.findByText('hola')).toBeInTheDocument();
    expect(screen.getByText('como estas')).toBeInTheDocument();
    expect(screen.queryByText('todo bien por aca')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('back-to-conversations'));
    expect(await screen.findByTestId('open-conversation-mi-reina')).toBeInTheDocument();
  });
});
