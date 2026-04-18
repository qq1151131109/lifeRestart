import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  server: { port: 5174, host: true },
  build: {
    outDir: '../dist-next',
    emptyOutDir: true,
  },
  publicDir: '../public',
})
