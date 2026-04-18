import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],
    include: [fileURLToPath(new URL('./**/*.{test,spec}.{ts,tsx}', import.meta.url))],
  },
})
