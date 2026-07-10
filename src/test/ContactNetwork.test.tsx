import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ContactNetwork from '../components/ContactNetwork';
import type { BackendLog } from '../types/dashboard';

const sampleLogs: BackendLog[] = [
  { id: '1', device_id: 'device-1', contact: 'Juan', type: 'WHATSAPP', timestamp: '2026-07-09T10:00:00' } as BackendLog,
];

describe('ContactNetwork', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra el estado vacio real cuando el backend responde OK con 0 conversaciones (no datos falsos)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ conversations: [] }), { status: 200 })
    );

    render(<ContactNetwork logs={sampleLogs} token="tok" onSelectContact={() => {}} />);

    await waitFor(() => expect(screen.getByText(/Sin contactos identificados/i)).toBeInTheDocument());
    // Regresion: NO debe mostrar "Juan" (derivado de logs locales) como si
    // fuera un contacto sincronizado real cuando el backend ya respondio
    // exitosamente que no hay ninguno.
    expect(screen.queryByText('Juan')).not.toBeInTheDocument();
  });

  it('muestra las conversaciones reales cuando el backend responde con datos', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(JSON.stringify({
      conversations: [
        { id: 1, device_id: 'device-1', contact: 'Maria', platform: 'WHATSAPP', last_message_at: '2026-07-09T10:00:00', last_direction: 'IN', message_count: 3, incoming_count: 2, outgoing_count: 1, created_at: '2026-07-01T00:00:00' },
      ],
    }), { status: 200 }));

    render(<ContactNetwork logs={sampleLogs} token="tok" onSelectContact={() => {}} />);

    await waitFor(() => expect(screen.getByText('Maria')).toBeInTheDocument());
  });

  it('cae al modo degradado (derivado de logs locales) solo ante un fallo real de conexion', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('Failed to fetch'));

    render(<ContactNetwork logs={sampleLogs} token="tok" onSelectContact={() => {}} />);

    await waitFor(() => expect(screen.getByText('Juan')).toBeInTheDocument());
  });
});
