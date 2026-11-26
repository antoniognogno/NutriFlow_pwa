import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify('0.1.2'),
    __APP_BUILD_ID__: JSON.stringify('test-build'),
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
