import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lets the app call the API on the same origin ("/api") during development.
    proxy: {
      '/api': process.env.VITE_DEV_API_TARGET || 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
