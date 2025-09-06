import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Am adăugat și favicon.ico și manifest.webmanifest pentru a fi mai complet
      includeAssets: ['favicon.ico', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'manifest.webmanifest'],
      manifest: {
        name: 'Mentor ANA',
        short_name: 'MentorANA',
        description: 'Învățare, simulări și teste — ofițeri',
        theme_color: '#0b0f0c',
        background_color: '#0b0f0c',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      // Am adăugat această secțiune pentru a controla explicit ce fișiere sunt puse în cache
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        cleanupOutdatedCaches: true
      }
    })
  ]
})