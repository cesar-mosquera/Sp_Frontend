import { StrictMode } from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import IndexPage from '../pages/IndexPage';

function renderAt(path: string) {
  // BrowserRouter (no MemoryRouter) a proposito: IndexPage lee
  // window.location.search directamente, y navigate() con BrowserRouter si
  // modifica window.location de verdad via el History API, igual que en
  // produccion/desarrollo. Se envuelve en StrictMode para reproducir el doble
  // montaje de efectos que React hace en desarrollo (monta -> limpia ->
  // vuelve a montar), que es justamente lo que causaba la regresion real.
  window.history.pushState({}, '', path);
  return render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/seleccion" element={<div>Pantalla de Seleccion</div>} />
          <Route path="/whatsapp" element={<div>Pantalla de WhatsApp</div>} />
          <Route path="/ubicacion" element={<div>Pantalla de Ubicacion</div>} />
          <Route path="/dashboard" element={<div>Pantalla de Dashboard</div>} />
        </Routes>
      </BrowserRouter>
    </StrictMode>
  );
}

describe('IndexPage: redirecciones (con StrictMode, como en desarrollo)', () => {
  it('redirige a /seleccion cuando no hay parametro plat', async () => {
    const { findByText } = renderAt('/');
    expect(await findByText('Pantalla de Seleccion')).toBeInTheDocument();
  });

  it('redirige a la pantalla del canal cuando plat es un canal conocido', async () => {
    const { findByText } = renderAt('/?plat=whatsapp');
    expect(await findByText('Pantalla de WhatsApp')).toBeInTheDocument();
  });

  it('redirige a /ubicacion cuando plat=ubicacion (regresion: faltaba en el mapa de canales)', async () => {
    const { findByText } = renderAt('/?plat=ubicacion');
    expect(await findByText('Pantalla de Ubicacion')).toBeInTheDocument();
  });

  it('cae al dashboard filtrado si plat no es un canal conocido', async () => {
    const { findByText } = renderAt('/?plat=canal-inexistente');
    expect(await findByText('Pantalla de Dashboard')).toBeInTheDocument();
  });
});
