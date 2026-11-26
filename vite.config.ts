import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version?: string }

const APP_VERSION = pkg.version ?? '0.1.0'
const BUILT_AT = new Date().toISOString()
const APP_BUILD_ID = BUILT_AT.slice(0, 16).replace(/[-:T]/g, '.')

function versionManifestPlugin(): Plugin {
  return {
    name: 'nutriflow-version-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            version: APP_VERSION,
            buildId: APP_BUILD_ID,
            builtAt: BUILT_AT,
          },
          null,
          2,
        ),
      })
    },
  }
}

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_BUILD_ID__: JSON.stringify(APP_BUILD_ID),
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    versionManifestPlugin(),
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
        navigateFallbackDenylist: [/^\/assets\//, /^\/version\.json/],
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
