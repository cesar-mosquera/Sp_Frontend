export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

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
    // 'text' y 'mensaje' sueltos se sacaron: matchesApp tambien los
    // compara contra entry.type, y esas son palabras genericas que
    // cualquier app de chat puede usar como tipo de evento (ej. un
    // mensaje de WhatsApp con type:"mensaje" terminaba clasificado
    // tambien como SMS). 'mensajetexto' ya es lo bastante especifico.
    matchKeys: ['sms', 'mensajetexto'],
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
    // 'search' se saco por el mismo motivo: Instagram, TikTok, etc. tienen
    // su propia busqueda interna y podrian mandar type:"search", lo que
    // los mezclaria con el feed de Google.
    matchKeys: ['google', 'gmail', 'chrome'],
  },
  ubicacion: {
    title: 'Ubicación',
    description: 'Rastreo GPS, historial de localizaciones y geocercas.',
    icon: '📍',
    headerColor: '#ff9800',
    appKey: 'ubicacion',
    // 'gps' se saco: es un termino tecnico generico que otras apps pueden
    // mencionar (ej. permisos, "compartir ubicacion GPS" dentro de un
    // mensaje de WhatsApp) sin ser en si un log de Ubicacion.
    matchKeys: ['ubicacion', 'ubicación', 'location', 'mapa'],
  },
  llamadas: {
    title: 'Llamadas',
    description: 'Registro de llamadas entrantes, salientes y perdidas.',
    icon: '📞',
    headerColor: '#00e0a0',
    appKey: 'llamadas',
    // 'call' suelto se saco: 'call_log' ya matchea el type real que manda
    // el backend (CALL_LOG normalizado) sin necesidad de la palabra
    // generica 'call', que colisionaba con llamadas de voz/video de
    // WhatsApp o Telegram (type conteniendo "call") y las duplicaba
    // tambien en este canal.
    matchKeys: ['call_log', 'llamada', 'llamadas'],
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
  llamadas: 'llamadas',
};
