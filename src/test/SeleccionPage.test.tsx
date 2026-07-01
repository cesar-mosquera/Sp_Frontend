import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
});
