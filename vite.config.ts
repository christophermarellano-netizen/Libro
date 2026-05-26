import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { amazonProxyPlugin } from './server/amazonProxyPlugin'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    amazonProxyPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Libro',
        short_name: 'Libro',
        description: 'Spanish learning ebook reader with tap-to-translate',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api/deepl-free': {
        target: 'https://api-free.deepl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepl-free/, ''),
      },
      '/api/deepl-pro': {
        target: 'https://api.deepl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepl-pro/, ''),
      },
    },
  },
  preview: {
    proxy: {
      '/api/deepl-free': {
        target: 'https://api-free.deepl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepl-free/, ''),
      },
      '/api/deepl-pro': {
        target: 'https://api.deepl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepl-pro/, ''),
      },
    },
  },
})
