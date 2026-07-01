import { LogMsg } from '../types/dashboard';

export const ICON_MAP: Record<string, { icon: string; cls: string }> = {
  WHATSAPP: { icon: '💬', cls: 'whatsapp' },
  NOTIF_WHATSAPP: { icon: '💬', cls: 'whatsapp' },
  SMS: { icon: '✉', cls: 'sms' },
  NOTIF_SMS: { icon: '✉', cls: 'sms' },
  CALL: { icon: '📞', cls: 'call' },
  TELEGRAM: { icon: '✈', cls: 'telegram' },
  NOTIF_TELEGRAM: { icon: '✈', cls: 'telegram' },
  INSTAGRAM: { icon: '📷', cls: 'instagram' },
  NOTIF_INSTAGRAM: { icon: '📷', cls: 'instagram' },
  LOCATION: { icon: '📍', cls: 'location' },
  EMAIL: { icon: '📧', cls: 'email' },
};

export const LOG_MESSAGES: LogMsg[] = [
  { app: 'WhatsApp', icon: '💬', iconClass: 'whatsapp', msg: 'Enviando video a <span class="highlight">Mi Reina</span>', contact: 'Mi Reina', contactShort: 'MR', type: 'outgoing', direction: 'Saliente', duration: '0:3:42', timeOffset: 0 },
  { app: 'WhatsApp', icon: '💬', iconClass: 'whatsapp', msg: 'Mensaje de texto recibido de <span class="highlight">El Jefe</span>', contact: 'El Jefe', contactShort: 'EJ', type: 'incoming', direction: 'Entrante', duration: '0:1:12', timeOffset: 2 },
  { app: 'SMS', icon: '✉', iconClass: 'sms', msg: 'SMS interceptado: Código 2FA <span class="highlight">839-221</span>', contact: 'Servicio +1 (555) 0192', contactShort: 'S', type: 'incoming', direction: 'Entrante', duration: '0:0:08', timeOffset: 5 },
  { app: 'Llamada', icon: '📞', iconClass: 'call', msg: 'Llamada saliente a <span class="highlight">Contacto X</span> — 4m 23s', contact: 'Contacto X', contactShort: 'CX', type: 'outgoing', direction: 'Saliente', duration: '4:23', timeOffset: 8 },
  { app: 'Telegram', icon: '✈', iconClass: 'telegram', msg: 'Mensaje cifrado en <span class="highlight">Canal Sigma</span>', contact: 'Canal Sigma', contactShort: 'Σ', type: 'incoming', direction: 'Entrante', duration: '0:0:31', timeOffset: 12 },
  { app: 'Instagram', icon: '📷', iconClass: 'instagram', msg: 'Story de <span class="highlight">Agente Luna</span> — ubicación detectada', contact: 'Agente Luna', contactShort: 'AL', type: 'incoming', direction: 'Entrante', duration: '0:0:15', timeOffset: 16 },
  { app: 'WhatsApp', icon: '💬', iconClass: 'whatsapp', msg: 'Audio recibido de <span class="highlight">Mi Reina</span> (0:47)', contact: 'Mi Reina', contactShort: 'MR', type: 'incoming', direction: 'Entrante', duration: '0:47', timeOffset: 20 },
  { app: 'Telegram', icon: '✈', iconClass: 'telegram', msg: 'Documento PDF descargado: <span class="highlight">plan_operativo.pdf</span>', contact: 'Bot Secreto', contactShort: 'B', type: 'incoming', direction: 'Entrante', duration: '0:2:05', timeOffset: 24 },
  { app: 'SMS', icon: '✉', iconClass: 'sms', msg: 'Alerta bancaria: Transacción de <span class="highlight">$4,500 USD</span>', contact: 'Banco Nacional', contactShort: 'BN', type: 'incoming', direction: 'Entrante', duration: '0:0:03', timeOffset: 28 },
  { app: 'WhatsApp', icon: '💬', iconClass: 'whatsapp', msg: 'Mensaje de voz de <span class="highlight">El Enlace</span> (1:23)', contact: 'El Enlace', contactShort: 'EE', type: 'incoming', direction: 'Entrante', duration: '1:23', timeOffset: 32 },
  { app: 'Llamada', icon: '📞', iconClass: 'call', msg: 'Llamada entrante de <span class="highlight">Número Desconocido</span> — 0:38', contact: 'Número Desconocido', contactShort: '?', type: 'incoming', direction: 'Entrante', duration: '0:38', timeOffset: 36 },
  { app: 'Location', icon: '📍', iconClass: 'location', msg: 'Geolocalización: <span class="highlight">19.4326, -99.1332</span> (CDMX)', contact: 'Dispositivo Objetivo #7', contactShort: 'D7', type: 'incoming', direction: 'Entrante', duration: '0:0:01', timeOffset: 40 },
  { app: 'Instagram', icon: '📷', iconClass: 'instagram', msg: 'Mensaje directo de <span class="highlight">Agente Z</span> — "Todo listo"', contact: 'Agente Z', contactShort: 'AZ', type: 'incoming', direction: 'Entrante', duration: '0:0:12', timeOffset: 45 },
];

export const LOCATION_DATA: Record<string, { lat: string; lon: string; ciudad: string; pais: string }> = {
  'Mi Reina': { lat: '19.4285° N', lon: '99.1276° O', ciudad: 'Ciudad de México', pais: 'México' },
  'El Jefe': { lat: '25.6866° N', lon: '100.3161° O', ciudad: 'Monterrey', pais: 'México' },
  'Contacto X': { lat: '40.7128° N', lon: '74.0060° O', ciudad: 'New York', pais: 'EE.UU.' },
  'Canal Sigma': { lat: '48.8566° N', lon: '2.3522° E', ciudad: 'Paris', pais: 'Francia' },
  'Agente Luna': { lat: '34.0522° N', lon: '118.2437° O', ciudad: 'Los Angeles', pais: 'EE.UU.' },
  'El Enlace': { lat: '19.4326° N', lon: '99.1332° O', ciudad: 'CDMX', pais: 'México' },
  'Agente Z': { lat: '4.7110° N', lon: '74.0721° O', ciudad: 'Bogotá', pais: 'Colombia' },
  'Bot Secreto': { lat: '55.7558° N', lon: '37.6173° E', ciudad: 'Moscú', pais: 'Rusia' },
  'Dispositivo Objetivo #7': { lat: '19.4326° N', lon: '99.1332° O', ciudad: 'CDMX', pais: 'México' },
};

export function formatTime(offsetMinutes: number) {
  const now = new Date();
  now.setMinutes(now.getMinutes() - offsetMinutes);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}
