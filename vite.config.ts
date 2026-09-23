import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // El service worker no se activa solo: avisamos al usuario y él decide
      // recargar. Así no se le cambia la vista mientras lee un reporte.
      registerType: 'prompt',
      // Sirve el manifiesto y el SW también en `vite dev`, para poder probar
      // la instalación sin hacer un build.
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Factyble Cloud · El Halcón',
        short_name: 'Factyble',
        description: 'Facturación electrónica de El Halcón Ferretería.',
        lang: 'es-PY',
        dir: 'ltr',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#ffffff',
        theme_color: '#00475C',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'Dashboard', url: '/', description: 'Resumen de facturación' },
          { name: 'Facturas', url: '/facturas', description: 'Listado de facturas' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Toda ruta desconocida cae en el index: es una SPA con rutas de cliente.
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Las respuestas de Supabase llevan datos de facturación y sesión:
            // nunca se guardan en caché.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
