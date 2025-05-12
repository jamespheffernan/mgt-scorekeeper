import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
  },
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '*.ngrok-free.app',
      '5cde-131-111-185-19.ngrok-free.app',
    ],
  },
})
