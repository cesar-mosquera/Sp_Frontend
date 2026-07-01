import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Spy Frontend',
        short_name: 'Spy',
        description: 'Panel de monitoreo y administración de dispositivos',
        theme_color: '#0a0014',
        background_color: '#0a0014',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/devices': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
