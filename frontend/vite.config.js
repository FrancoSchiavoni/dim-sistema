import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    // Esto le dice a Vite que permita el tráfico desde tu dominio de Railway
    allowedHosts: ['dim-sistema-web.up.railway.app', 'dim-sistema-frontend-staging.up.railway.app', 'test-dim-sistema-web.up.railway.app/'],
  }
})