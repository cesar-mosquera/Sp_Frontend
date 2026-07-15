import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SeleccionPage from '../pages/SeleccionPage';
import { useAuthStore } from '../store';

describe('SeleccionPage', () => {
  beforeEach(() => {
    // role: 'admin' evita el chequeo de suscripcion (isAllowed siempre true
    // para admin) -- estos tests verifican navegacion, no el control de
    // acceso por suscripcion, que se prueba aparte.
    useAuthStore.setState({ isAuthenticated: true, token: null, role: 'admin', username: 'admin', deviceId: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <SeleccionPage />
      </MemoryRouter>
    );
    expect(screen.getByText((content) => content.includes('Seleccione Canal'))).toBeInTheDocument();
  });

  it('renders app cards', () => {
    render(
      <MemoryRouter>
        <SeleccionPage />
      </MemoryRouter>
    );
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText('TikTok')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
  });

  it('ignora clics repetidos durante la transicion y navega solo al primer destino elegido', async () => {
    render(
      <MemoryRouter initialEntries={['/seleccion']}>
        <Routes>
          <Route path="/seleccion" element={<SeleccionPage />} />
          <Route path="/whatsapp" element={<div>Pantalla de WhatsApp</div>} />
          <Route path="/tiktok" element={<div>Pantalla de TikTok</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('WhatsApp'));
    fireEvent.click(screen.getByText('TikTok'));

    expect(await screen.findByText('Pantalla de WhatsApp')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla de TikTok')).not.toBeInTheDocument();

    await waitFor(() => expect(document.body.children.length).toBe(1));
  });

  it('regresion: fail-closed -- sin sesion/suscripcion confirmada, las tarjetas quedan bloqueadas (no navegables)', async () => {
    useAuthStore.setState({ isAuthenticated: true, token: 'tok-user', role: 'user', username: 'juan', deviceId: null });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(
      <MemoryRouter initialEntries={['/seleccion']}>
        <Routes>
          <Route path="/seleccion" element={<SeleccionPage />} />
          <Route path="/whatsapp" element={<div>Pantalla de WhatsApp</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Antes, mientras no cargaba (o si /api/subscriptions fallaba para
    // siempre) todas las tarjetas quedaban desbloqueadas por defecto.
    // Con las 9 apps del catalogo bloqueadas a la vez, hay multiples
    // insignias "Sin acceso" -- se usa getAllByText en vez de getByText.
    await waitFor(() => expect(screen.getAllByText('Sin acceso', { exact: false }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText('WhatsApp'));
    expect(screen.queryByText('Pantalla de WhatsApp')).not.toBeInTheDocument();
  });

  it('desbloquea solo las tarjetas con suscripcion activa confirmada', async () => {
    useAuthStore.setState({ isAuthenticated: true, token: 'tok-user', role: 'user', username: 'juan', deviceId: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      subscriptions: [{ app_name: 'whatsapp', active: true }],
    }), { status: 200 })));

    render(
      <MemoryRouter initialEntries={['/seleccion']}>
        <Routes>
          <Route path="/seleccion" element={<SeleccionPage />} />
          <Route path="/whatsapp" element={<div>Pantalla de WhatsApp</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText('WhatsApp'));
    expect(await screen.findByText('Pantalla de WhatsApp')).toBeInTheDocument();
  });
});
