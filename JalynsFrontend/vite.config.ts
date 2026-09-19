import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
    // Same-origin on phones/LAN: page is :5173, backend stays on this PC's :3000.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        timeout: 120_000,
        proxyTimeout: 120_000,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers.authorization
            if (auth) proxyReq.setHeader('Authorization', auth)
            const access = req.headers['x-access-token']
            if (typeof access === 'string' && access) {
              proxyReq.setHeader('x-access-token', access)
            }
          })
        },
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
    },
  },
})
