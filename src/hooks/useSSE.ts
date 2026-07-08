import { useEffect, useRef, useCallback, useState } from 'react';
import { API_BASE_URL } from '../config';

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

type EventHandler = (event: SSEEvent) => void;

interface UseSSEReturn {
  isConnected: boolean;
  reconnectCount: number;
}

export function useSSE(path: string, onEvent: EventHandler, enabled = true): UseSSEReturn {
  const sourceRef = useRef<EventSource | null>(null);
  const handlerRef = useRef(onEvent);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);

  handlerRef.current = onEvent;

  const cleanup = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;

    cleanup();

    const url = `${API_BASE_URL}${path}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      setIsConnected(true);
      console.log('SSE conectado:', url);
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

    source.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
      source.close();

      // Exponential backoff reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectCount(prev => prev + 1);
        connect();
      }, delay);
    };
  }, [path, enabled, reconnectCount, cleanup]);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    connect();

    return () => {
      cleanup();
    };
  }, [enabled, path, cleanup, connect]);

  return { isConnected, reconnectCount };
}
