import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'chrome108', cssTarget: 'chrome108' },
  server: { port: 5173, strictPort: true },
})
