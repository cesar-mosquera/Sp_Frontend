import { type AppPageConfig } from './config';

export interface LogEntry {
  contact: string;
  msg: string;
  timestamp: string;
  type: 'message' | 'notificacion';
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
}

export interface AppPageState {
  config: AppPageConfig;
  currentSort: 'contact' | 'message';
  selectedType: 'all' | 'message' | 'notificacion';
  currentData: LogEntry[];
  filteredData: LogEntry[];
}

export function createAppPageState(config: AppPageConfig): AppPageState {
  return {
    config,
    currentSort: 'contact',
    selectedType: 'all',
    currentData: [],
    filteredData: [],
  };
}

export function normalize(text: string | null | undefined): string {
  return (text || '').toString().toLowerCase();
}

export function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return '--:--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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

export function mapBackendLogs(logs: BackendLog[]): LogEntry[] {
  return logs.map(entry => ({
    contact: entry.contact || entry.sender || 'Contacto desconocido',
    msg: entry.msg || entry.content || entry.message || '',
    timestamp: entry.timestamp || entry.time || '',
    type: normalize(entry.type).includes('notif') ? 'notificacion' : 'message',
  }));
}
