import { createContext, useContext, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useSSE } from '../hooks/useSSE';

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

type EventHandler = (event: SSEEvent) => void;

interface SSEContextValue {
  isConnected: boolean;
  subscribe: (handler: EventHandler) => () => void;
}

const SSEContext = createContext<SSEContextValue | null>(null);

export function SSEProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef<Set<EventHandler>>(new Set());

  const dispatch = useCallback((event: SSEEvent) => {
    listenersRef.current.forEach(handler => handler(event));
  }, []);

  const { isConnected } = useSSE('/api/sse', dispatch);

  const subscribe = useCallback((handler: EventHandler) => {
    listenersRef.current.add(handler);
    return () => { listenersRef.current.delete(handler); };
  }, []);

  return (
    <SSEContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSEEvents(onEvent: EventHandler): { isConnected: boolean } {
  const ctx = useContext(SSEContext);
  if (!ctx) throw new Error('useSSEEvents debe usarse dentro de <SSEProvider>');
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    return ctx.subscribe(event => handlerRef.current(event));
  }, [ctx]);

  return { isConnected: ctx.isConnected };
}
