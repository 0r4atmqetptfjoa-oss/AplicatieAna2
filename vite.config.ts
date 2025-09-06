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
      includeAssets: ['favicon.ico', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
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
      workbox: {
        // Asigurăm că fișierele esențiale sunt puse în cache și evităm duplicatele
        globPatterns: ['**/*.{js,css,html,woff2}'],
        cleanupOutdatedCaches: true
      }
    })
  ]
})