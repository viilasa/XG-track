import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/twitter': {
        target: 'https://api.twitterapi.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/twitter/, ''),
        secure: true,
      },
      '/api/x': {
        target: 'https://api.x.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/x/, ''),
        secure: true,
      },
    },
  },
})
