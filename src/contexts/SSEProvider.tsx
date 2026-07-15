import { createContext, useContext, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
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
    // Cada listener se aisla en su propio try/catch: si uno lanza una
    // excepcion (ej. datos con una forma inesperada), no debe cortar la
    // entrega del mismo evento al resto de los suscriptores (otras
    // pestañas de app, notificaciones, etc.) -- sin esto, un solo handler
    // roto silenciaba las actualizaciones en tiempo real de todos los demas.
    listenersRef.current.forEach(handler => {
      try {
        handler(event);
      } catch (err) {
        console.error('[SSEProvider] Error en un listener de evento SSE:', err);
      }
    });
  }, []);

  const { isConnected } = useSSE('/api/sse', dispatch);

  const subscribe = useCallback((handler: EventHandler) => {
    listenersRef.current.add(handler);
    return () => { listenersRef.current.delete(handler); };
  }, []);

  const value = useMemo(() => ({ isConnected, subscribe }), [isConnected, subscribe]);

  return (
    <SSEContext.Provider value={value}>
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
