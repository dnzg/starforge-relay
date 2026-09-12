import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 43123,
    host: true,
  },
  preview: {
    port: 43123,
    host: true,
  },
})
