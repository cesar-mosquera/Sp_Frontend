# Spy Server — Frontend

Panel de monitoreo visual para Spy Server.

## ¿Qué hace?
Este es el frontend web del sistema de monitoreo. Muestra datos en tiempo real del backend mediante su API REST.

## Uso

1. Edita `src/config.js` con la URL del backend:
```js
const API_BASE_URL = "https://url-del-backend.ngrok.io";
```

2. Abre `index.html` en tu navegador.

## Deploy automático
Este repo despliega automáticamente a GitHub Pages con cada `push` a `main`.

## Archivos

```
frontend/
├── index.html       # Dashboard principal
├── styles.css       # Estilos del dashboard
├── app.js           # Lógica del dashboard
├── dashboard.html   # Dashboard alternativo (todo-en-uno)
├── src/config.js    # Configuración del backend
└── .github/workflows/  # CI/CD
```

## Stack
HTML + CSS + JavaScript vanilla. Sin dependencias externas.
