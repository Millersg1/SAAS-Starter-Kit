import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SAAS Surface — Powered by Surf',
        short_name: 'SAAS Surface',
        description: 'Agency OS powered by Surf. CRM, invoicing, client portal, marketing automation, and AI voice.',
        theme_color: '#2563eb',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/dashboard',
        scope: '/',
        categories: ['business', 'productivity'],
        screenshots: [],
        shortcuts: [
          { name: 'Dashboard', url: '/dashboard', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Clients', url: '/clients', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Invoices', url: '/invoices', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Pipeline', url: '/pipeline', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
})
