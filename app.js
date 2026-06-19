const logsData = [
    { type: 'agents', msg: 'WhatsApp - Enviando video a Mi Reina', time: '0:34M', size: '12MB' },
    { type: 'agents', msg: 'Telegram - Extrayendo ubicación (Agente 007)', time: '0:34M', size: '1.2MB' },
    { type: 'intercepts', msg: 'Llamada interceptada - Canal Seguro B', time: '0:33M', size: '4.5MB' },
    { type: 'data', msg: 'Paquete de datos encriptado descargado', time: '0:32M', size: '256MB' },
    { type: 'ops', msg: 'Operación "Sombra" completada con éxito', time: '0:30M', size: '0.1MB' },
    { type: 'success', msg: 'Verificación de integridad de archivos', time: '0:29M', size: 'OK' },
    { type: 'nodes', msg: 'Nodo de red en sector 7 conectado', time: '0:28M', size: 'Ping 5ms' },
    { type: 'agents', msg: 'WhatsApp - Recibiendo audio', time: '0:25M', size: '3.4MB' },
    { type: 'intercepts', msg: 'SMS Interceptado - Número Desconocido', time: '0:24M', size: '2KB' },
    { type: 'ops', msg: 'Inicio de despliegue en servidor secundario', time: '0:22M', size: 'N/A' },
];

const logListElement = document.getElementById('log-list');
const logFilterIndicator = document.getElementById('log-filter-indicator');
const resetFilterBtn = document.getElementById('reset-filter');
const statCards = document.querySelectorAll('.stat-card');

let currentFilter = 'all';

// Mapeo de filtros a nombres descriptivos
const filterNames = {
    'ops': '(Filtrado: Operaciones)',
    'success': '(Filtrado: Tasa de Éxito)',
    'nodes': '(Filtrado: Nodos)',
    'agents': '(Filtrado: Agentes)',
    'intercepts': '(Filtrado: Intercepciones)',
    'data': '(Filtrado: Datos)'
};

// Función para renderizar los logs
function renderLogs(filter = 'all') {
    logListElement.innerHTML = '';
    
    const filteredLogs = filter === 'all' 
        ? logsData 
        : logsData.filter(log => log.type === filter);

    if (filteredLogs.length === 0) {
        logListElement.innerHTML = '<li class="log-item"><span class="log-msg">No hay registros recientes para esta categoría.</span></li>';
        return;
    }

    filteredLogs.forEach(log => {
        const li = document.createElement('li');
        li.className = 'log-item';
        li.innerHTML = `
            <span class="log-time">${log.time}</span>
            <span class="log-msg">${log.msg}</span>
            <span class="log-size">${log.size}</span>
        `;
        logListElement.appendChild(li);
    });
}

// Configurar interactividad de las tarjetas
statCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remover clase activa de todas
        statCards.forEach(c => c.classList.remove('active'));
        
        // Agregar a la seleccionada
        card.classList.add('active');
        
        // Obtener filtro
        const filter = card.getAttribute('data-filter');
        currentFilter = filter;
        
        // Actualizar UI
        logFilterIndicator.textContent = filterNames[filter];
        resetFilterBtn.style.display = 'block';
        
        // Animación suave de recarga de logs
        logListElement.style.opacity = '0';
        setTimeout(() => {
            renderLogs(filter);
            logListElement.style.opacity = '1';
        }, 200);
    });
});

// Botón de resetear filtro
resetFilterBtn.addEventListener('click', () => {
    currentFilter = 'all';
    statCards.forEach(c => c.classList.remove('active'));
    logFilterIndicator.textContent = '';
    resetFilterBtn.style.display = 'none';
    
    logListElement.style.opacity = '0';
    setTimeout(() => {
        renderLogs('all');
        logListElement.style.opacity = '1';
    }, 200);
});

// Simular datos dinámicos (Latencia y Conexiones variando)
function simulateDynamicData() {
    const latencyEl = document.getElementById('latency-val');
    const connEl = document.getElementById('connections-val');
    
    setInterval(() => {
        // Variar latencia entre 8ms y 25ms
        const newLatency = Math.floor(Math.random() * 17) + 8;
        latencyEl.textContent = `${newLatency} ms`;
        
        // Latencia alta cambia color
        if(newLatency > 20) {
            latencyEl.style.color = '#ff2a85';
            latencyEl.style.textShadow = '0 0 10px rgba(255,42,133,0.5)';
        } else {
            latencyEl.style.color = 'var(--text-main)';
            latencyEl.style.textShadow = 'none';
        }

        // Variar conexiones
        const currentConn = parseInt(connEl.textContent);
        const diff = Math.floor(Math.random() * 11) - 5; // -5 to +5
        connEl.textContent = currentConn + diff;
    }, 3000);
}

// Inicializar
renderLogs();
simulateDynamicData();
