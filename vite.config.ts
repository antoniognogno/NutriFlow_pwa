import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  css: {
    postcss: {
      plugins: [],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/android/android-launchericon-192-192.png'],
      manifest: {
        name: 'NutriFlow',
        short_name: 'NutriFlow',
        description: 'Organizza studio, allenamento e benessere.',
        theme_color: '#070d14',
        background_color: '#070d14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/android/android-launchericon-192-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/android/android-launchericon-512-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'free-exercise-db-cache',
              expiration: {
                maxEntries: 250,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/victory-vendor') || id.includes('node_modules/d3-')) {
            return 'vendor-charts'
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase'
          }
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix'
          }
          if (id.includes('node_modules/dexie')) {
            return 'vendor-dexie'
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      {
        find: /^next\/link$/,
        replacement: fileURLToPath(new URL('./src/compat/next-link.tsx', import.meta.url)),
      },
      {
        find: /^next\/navigation$/,
        replacement: fileURLToPath(new URL('./src/compat/next-navigation.ts', import.meta.url)),
      },
    ],
  },
})
