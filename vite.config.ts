import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // .env sets NODE_ENV=development for the backend; without this, `vite build` would ship
  // React's development build (about 3× larger and slower) to clients.
  define: command === 'build' ? { 'process.env.NODE_ENV': JSON.stringify('production') } : undefined,
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
