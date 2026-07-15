import { type AppPageConfig } from './config';

export interface LogEntry {
  id: string;
  contact: string;
  msg: string;
  timestamp: string;
  type: 'message' | 'notificacion';
  direction: 'IN' | 'OUT' | 'UNKNOWN';
  deviceId: string;
}

export interface BackendLog {
  id?: number | string;
  type?: string;
  content?: string;
  timestamp?: string;
  time?: string;
  contact?: string;
  sender?: string;
  msg?: string;
  message?: string;
  app?: string;
  platform?: string;
  source?: string;
  appKey?: string;
  service?: string;
  device_id?: string;
  direction?: string;
}

export function normalize(text: string | null | undefined): string {
  return (text || '').toString().toLowerCase();
}

export function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return '--:--';
  // Se extrae la hora directamente del string (sin pasar por Date +
  // zona horaria del navegador) para que siempre muestre la hora exacta
  // que registro el backend, sin importar en que zona horaria este
  // navegando quien ve el panel -- lo contrario correria la hora del
  // evento si el admin ve el panel desde otro huso horario que el backend.
  const isoMatch = timestamp.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// Mismo motivo que formatTimestamp: se extrae la fecha (y hora, en su
// version completa) directamente del string ISO en vez de pasar por
// Date + zona horaria del navegador, para que fechas como "registro de
// dispositivo", "expiracion de sesion" o "arranque del backend" muestren
// siempre el dia exacto que registro el backend.
export function formatExactDate(timestamp: string | null | undefined): string {
  if (!timestamp) return '--';
  const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('es-ES');
}

export function formatExactDateTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '--';
  const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return `${day}/${month}/${year}, ${hour}:${minute}`;
  }
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '--';
  return date.toLocaleString('es-ES');
}

export function extractAppValue(entry: BackendLog): string {
  return normalize(entry.app || entry.platform || entry.source || entry.appKey || entry.service || '');
}

export function matchesApp(entry: BackendLog, config: AppPageConfig): boolean {
  const appValue = extractAppValue(entry);
  const typeValue = normalize(entry.type || '');
  const validKeys = [config.appKey, ...(config.matchKeys || [])];
  return validKeys.some(key =>
    appValue === key || appValue.includes(key) || typeValue === key || typeValue.includes(key)
  );
}

function normalizeDirection(direction: string | undefined): 'IN' | 'OUT' | 'UNKNOWN' {
  const d = normalize(direction);
  if (d === 'out' || d === 'outgoing' || d === 'saliente') return 'OUT';
  if (d === 'in' || d === 'incoming' || d === 'entrante') return 'IN';
  return 'UNKNOWN';
}

export function mapBackendLogs(logs: BackendLog[]): LogEntry[] {
  return logs.map((entry, index) => ({
    id: entry.id !== undefined ? String(entry.id) : `${entry.device_id || 'sin-device'}-${entry.timestamp || index}`,
    contact: entry.contact || entry.sender || 'Contacto desconocido',
    msg: entry.msg || entry.content || entry.message || '',
    timestamp: entry.timestamp || entry.time || '',
    type: normalize(entry.type).includes('notif') ? 'notificacion' : 'message',
    direction: normalizeDirection(entry.direction),
    deviceId: entry.device_id || '',
  }));
}
