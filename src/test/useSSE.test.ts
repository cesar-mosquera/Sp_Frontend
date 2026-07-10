import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE } from '../hooks/useSSE';

class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
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

describe('useSSE', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    (globalThis as unknown as { EventSource: unknown }).EventSource = MockEventSource;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no marca desconectado de inmediato ante un error transitorio que se recupera antes de 4s', () => {
    const { result } = renderHook(() => useSSE('/api/sse', () => {}));

    act(() => { MockEventSource.instances[0].onopen?.(); });
    expect(result.current.isConnected).toBe(true);

    act(() => { MockEventSource.instances[0].onerror?.(); });
    // Regresion: antes el error marcaba isConnected=false al instante,
    // provocando un parpadeo del banner de "desconectado" en cada blip de
    // red aunque la reconexion fuera casi inmediata.
    expect(result.current.isConnected).toBe(true);

    act(() => { vi.advanceTimersByTime(1000); });
    // El reintento (backoff de 1s) crea una nueva conexion que abre bien.
    act(() => { MockEventSource.instances[1].onopen?.(); });
    expect(result.current.isConnected).toBe(true);

    // El timeout de "desconectado" pendiente de la conexion anterior no
    // debe disparar tardiamente y tumbar el estado ya reconectado.
    act(() => { vi.advanceTimersByTime(4000); });
    expect(result.current.isConnected).toBe(true);
  });

  it('marca desconectado tras 4s si el error persiste sin reconexion exitosa', () => {
    const { result } = renderHook(() => useSSE('/api/sse', () => {}));

    act(() => { MockEventSource.instances[0].onopen?.(); });
    act(() => { MockEventSource.instances[0].onerror?.(); });
    expect(result.current.isConnected).toBe(true);

    act(() => { vi.advanceTimersByTime(4000); });
    expect(result.current.isConnected).toBe(false);
  });
});
