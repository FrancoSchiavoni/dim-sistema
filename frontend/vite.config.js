import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    // Esto le dice a Vite que permita el tráfico desde tu dominio de Railway
    allowedHosts: ['dim-sistema-frontend-production.up.railway.app'],
  }
})