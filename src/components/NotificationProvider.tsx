import { useCallback } from 'react';
import { useSSEEvents } from '../contexts/SSEProvider';
import NotificationToast, { notify } from './NotificationToast';

export default function NotificationProvider() {
  const onEvent = useCallback((event: { type: string; data: Record<string, unknown> }) => {
    switch (event.type) {
      case 'new_data': {
        const d = event.data;
        // String(...) en vez de castear a string: si el backend manda
        // content como numero, null, o algo no-string, castear con "as
        // string" igual deja pasar el valor tal cual y .slice() revienta
        // en tiempo de ejecucion (ej. content: 123 -> "123.slice is not a
        // function"), lo cual antes cortaba en silencio la entrega de
        // este evento a los demas suscriptores (ver SSEProvider.dispatch).
        const content = d.content != null ? String(d.content) : '';
        notify(
          `📡 ${d.type || 'Nuevos datos'}`,
          `Dispositivo ${d.device_id || 'desconocido'} — ${content.slice(0, 80)}`,
          'info',
        );
        break;
      }
      case 'device_registered': {
        const d = event.data;
        notify(
          '🔌 Nuevo dispositivo',
          `${d.name || d.device_id} se ha registrado`,
          'success',
        );
        break;
      }
    }
  }, []);

  useSSEEvents(onEvent);

  return <NotificationToast />;
}
