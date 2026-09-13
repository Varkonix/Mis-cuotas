import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// IMPORTANTE: "base" debe coincidir con el nombre de tu repo en GitHub,
// porque GitHub Pages sirve el sitio en https://<usuario>.github.io/<repo>/
export default defineConfig({
  base: '/Mis-cuotas/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mis Cuotas',
        short_name: 'Mis Cuotas',
        description: 'Seguimiento de cuotas mensuales y gastos fijos',
        theme_color: '#065f46',
        background_color: '#f5f5f4',
        display: 'standalone',
        start_url: '/Mis-cuotas/',
        scope: '/Mis-cuotas/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}']
      }
    })
  ]
})
