const APP_PAGE_CONFIG = {
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
};

function createAppPageState(config) {
  const state = {
    config,
    currentSort: 'contact',
    selectedType: 'all',
    currentData: [],
    filteredData: [],
  };

  state.normalize = text => (text || '').toString().toLowerCase();

  state.formatTimestamp = timestamp => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  state.setActiveSort = id => {
    document.getElementById('sortContactBtn').classList.toggle('active', id === 'sortContactBtn');
    document.getElementById('sortMessageBtn').classList.toggle('active', id === 'sortMessageBtn');
  };

  state.setActiveFilter = type => {
    state.selectedType = type;
    document.querySelectorAll('.filter-pill').forEach(button => {
      button.classList.toggle('active', button.dataset.type === type);
    });
  };

  state.updateStats = data => {
    document.getElementById('countMessages').textContent = data.length;
    document.getElementById('countAlerts').textContent = data.filter(item => item.type === 'notificacion').length || '0';
    document.getElementById('countContacts').textContent = new Set(data.map(item => state.normalize(item.contact))).size;
  };

  state.extractAppValue = entry => {
    return state.normalize(entry.app || entry.platform || entry.source || entry.appKey || entry.service || '');
  };

  state.extractTypeValue = entry => state.normalize(entry.type || '');

  state.matchesApp = (entry, appKey) => {
    const appValue = state.extractAppValue(entry);
    const typeValue = state.extractTypeValue(entry);
    const textValue = state.normalize(entry.msg || entry.content || entry.message || '');
    const validKeys = [appKey, ...(config.matchKeys || [])];
    const matchesAppKey = validKeys.some(key => appValue === key || appValue.includes(key) || typeValue.includes(key) || textValue.includes(key));
    return matchesAppKey;
  };

  state.renderList = () => {
    const container = document.getElementById('app-list');
    container.innerHTML = '';

    const query = state.normalize(document.getElementById('searchInput').value);
    state.filteredData = state.currentData.filter(item => {
      const matchesType = state.selectedType === 'all' || item.type === state.selectedType;
      const text = `${item.contact} ${item.msg}`;
      return matchesType && state.normalize(text).includes(query);
    });

    if (state.currentSort === 'contact') {
      state.filteredData.sort((a, b) => state.normalize(a.contact).localeCompare(state.normalize(b.contact)));
    } else {
      state.filteredData.sort((a, b) => state.normalize(a.msg).localeCompare(state.normalize(b.msg)));
    }

    document.getElementById('resultCount').textContent = `${state.filteredData.length} elemento${state.filteredData.length === 1 ? '' : 's'}`;

    if (!state.filteredData.length) {
      container.innerHTML = '<div class="empty-state">No se encontraron mensajes que coincidan.</div>';
      return;
    }

    state.filteredData.forEach(entry => {
      const card = document.createElement('article');
      card.className = 'chat-message';
      card.innerHTML = `
        <div class="chat-header">
          <div>
            <strong>${entry.contact}</strong>
            <div class="chat-label">${entry.type === 'notificacion' ? 'Notificación' : 'Mensaje'}</div>
          </div>
          <small>${state.formatTimestamp(entry.timestamp)}</small>
        </div>
        <div class="chat-body">${entry.msg}</div>
      `;
      container.appendChild(card);
    });
  };

  state.attachEvents = () => {
    document.getElementById('searchInput').addEventListener('input', state.renderList);
    document.getElementById('clearSearch').addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      state.renderList();
    });
    document.getElementById('sortContactBtn').addEventListener('click', () => {
      state.currentSort = 'contact';
      state.setActiveSort('sortContactBtn');
      state.renderList();
    });
    document.getElementById('sortMessageBtn').addEventListener('click', () => {
      state.currentSort = 'message';
      state.setActiveSort('sortMessageBtn');
      state.renderList();
    });
    document.querySelectorAll('.filter-pill').forEach(button => {
      button.addEventListener('click', () => {
        state.setActiveFilter(button.dataset.type);
        state.renderList();
      });
    });
  };

  state.loadPage = async (fallbackSample, queryFilter) => {
    if (!queryFilter) {
      queryFilter = entry => state.matchesApp(entry, config.appKey);
    }

    const container = document.getElementById('app-list');
    container.innerHTML = '<div class="empty-state">Cargando datos...</div>';
    let logs = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const response = await fetch(API_BASE_URL + '/api/dashboard-data', {
        headers: { 'X-Dashboard-Key': DASHBOARD_KEY },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        let source = [];
        if (Array.isArray(data.logs)) {
          source = data.logs;
        } else if (Array.isArray(data.messages)) {
          source = data.messages;
        } else if (Array.isArray(data.data)) {
          source = data.data;
        } else if (Array.isArray(data)) {
          source = data;
        }
        logs = source.filter(entry => queryFilter(entry));
      }
    } catch (error) {
      console.warn('Error cargando datos del backend:', error);
      logs = [];
    }

    if (!logs.length) {
      state.currentData = fallbackSample;
      container.innerHTML = '<div class="empty-state">No se encontraron registros reales. Se muestran muestras de respaldo.</div>';
      console.warn(`No se encontraron registros para ${config.title}. Usando datos de fallback.`);
    } else {
      state.currentData = logs.map(entry => ({
        contact: entry.contact || entry.sender || 'Contacto desconocido',
        msg: entry.msg || entry.content || entry.message || '',
        timestamp: entry.timestamp || entry.time || '',
        type: state.normalize(entry.type).includes('notif') ? 'notificacion' : 'message'
      }));
    }

    state.updateStats(state.currentData);
    state.attachEvents();
    state.renderList();
  };

  return state;
}
