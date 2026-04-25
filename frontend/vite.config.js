import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    cssTarget: ['chrome94', 'edge94', 'firefox93', 'safari16.3', 'ios16.3', 'opera80'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
