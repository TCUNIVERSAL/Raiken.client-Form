import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// .env sets NODE_ENV=development for the backend server — but Vite also reads
// it, causing the React plugin to emit jsxDEV (dev) calls while the React
// runtime is compiled for production (where jsxDEV = undefined).
// Fix: force mode:'production' during `vite build` so both agree.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  mode: command === 'build' ? 'production' : undefined,
  build: {
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5175,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true
      }
    }
  }
}));
