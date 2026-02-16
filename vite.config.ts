import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || './',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: isDev ? {
    port: 5173,
    strictPort: true,
    proxy: {
      '/fmi': {
        target: 'https://192.168.0.24',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', () => {
            console.log('Sending request to the target');
          });
          proxy.on('proxyRes', (proxyRes) => {
            console.log('Received response from the target:', proxyRes.statusCode);
          });
        },
      }
    }
  } : undefined,
})
