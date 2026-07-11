import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

  it('muestra "no se encontraron mensajes" solo despues de terminar de cargar sin resultados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ logs: [] }), { status: 200 }))
    ));

    renderAppPage();

    await waitFor(() => expect(screen.getByText('No se encontraron mensajes que coincidan.')).toBeInTheDocument());
    expect(screen.queryByTestId('app-list-loading')).not.toBeInTheDocument();
  });
});
