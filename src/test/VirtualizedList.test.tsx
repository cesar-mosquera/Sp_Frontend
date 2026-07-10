import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { List } from 'react-window';
import LogEntryRow from '../components/LogEntryRow';
import ChatMessageRow from '../components/ChatMessageRow';
import type { BackendLog } from '../types/dashboard';
import type { LogEntry } from '../appPage';

beforeAll(() => {
  // jsdom no implementa ResizeObserver; react-window lo usa para medir el contenedor.
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

function makeBackendLogs(count: number): BackendLog[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    type: 'WHATSAPP',
    content: `mensaje de prueba numero ${i}`,
    timestamp: '2026-07-09T10:00:00',
    device_id: 'device-1',
  }));
}

function makeChatEntries(count: number): LogEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    contact: `Contacto ${i}`,
    msg: `mensaje de prueba numero ${i}`,
    timestamp: '2026-07-09T10:00:00',
    type: 'message',
  }));
}

describe('Listas virtualizadas', () => {
  it('DashboardPage: solo renderiza una fraccion de las filas de log en el DOM', () => {
    const entries = makeBackendLogs(1000);
    const { container } = render(
      <div style={{ height: 400 }}>
        <List
          style={{ height: 400 }}
          rowCount={entries.length}
          rowHeight={104}
          rowComponent={LogEntryRow}
          rowProps={{
            entries,
            isReal: true,
            knownDevices: {},
            onExpand: () => {},
            onAppClick: () => {},
          }}
        />
      </div>
    );

    const rendered = container.querySelectorAll('.log-entry').length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(entries.length / 2);
  });

  it('AppPage: solo renderiza una fraccion de los mensajes de chat en el DOM', () => {
    const entries = makeChatEntries(1000);
    const { container } = render(
      <List
        style={{ height: 600 }}
        rowCount={entries.length}
        rowHeight={140}
        rowComponent={ChatMessageRow}
        rowProps={{ entries }}
      />
    );

    const rendered = container.querySelectorAll('.chat-message').length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(entries.length / 2);
  });
});
