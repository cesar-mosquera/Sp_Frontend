import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SeleccionPage from '../pages/SeleccionPage';

describe('SeleccionPage', () => {
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
});
