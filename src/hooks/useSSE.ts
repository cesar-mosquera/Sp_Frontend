import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

type EventHandler = (event: SSEEvent) => void;

interface UseSSEReturn {
  isConnected: boolean;
}

export function useSSE(path: string, onEvent: EventHandler, enabled = true): UseSSEReturn {
  const sourceRef = useRef<EventSource | null>(null);
  const handlerRef = useRef(onEvent);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const mountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  handlerRef.current = onEvent;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const cleanup = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    setIsConnected(false);
  };

  const connect = () => {
    if (!enabled || !mountedRef.current) return;

    cleanup();

    const url = `${API_BASE_URL}${path}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      if (!mountedRef.current) { source.close(); return; }
      setIsConnected(true);
      reconnectCountRef.current = 0;
    };

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handlerRef.current({ type: 'message', data });
      } catch (e) { console.warn('SSE message parse error:', e); }
    };

    source.addEventListener('new_data', (event: MessageEvent) => {
      try {
        handlerRef.current({ type: 'new_data', data: JSON.parse(event.data) });
      } catch (e) { console.warn('SSE new_data parse error:', e); }
    });

    source.addEventListener('device_registered', (event: MessageEvent) => {
      try {
        handlerRef.current({ type: 'device_registered', data: JSON.parse(event.data) });
      } catch (e) { console.warn('SSE device_registered parse error:', e); }
    });

    source.addEventListener('log_entry', (event: MessageEvent) => {
      try {
        handlerRef.current({ type: 'log_entry', data: JSON.parse(event.data) });
      } catch (e) { console.warn('SSE log_entry parse error:', e); }
    });

    source.onerror = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      source.close();
      sourceRef.current = null;

      const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000);
      reconnectCountRef.current += 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };
  };

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }
    connect();
    return cleanup;
  }, [enabled, path]);

  return { isConnected };
}
