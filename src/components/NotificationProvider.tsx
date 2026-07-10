import { useCallback } from 'react';
import { useSSEEvents } from '../contexts/SSEProvider';
import NotificationToast, { notify } from './NotificationToast';

export default function NotificationProvider() {
  const onEvent = useCallback((event: { type: string; data: Record<string, unknown> }) => {
    switch (event.type) {
      case 'new_data': {
        const d = event.data;
        notify(
          `📡 ${d.type || 'Nuevos datos'}`,
          `Dispositivo ${d.device_id || 'desconocido'} — ${(d.content as string || '').slice(0, 80)}`,
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
