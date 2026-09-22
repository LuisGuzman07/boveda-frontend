import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isProductionDeployment = process.env.DEPLOY_MODE === 'prod'
const apiUrl = process.env.VITE_API_URL || (
  isProductionDeployment
    ? 'https://api-bovedag4.duckdns.org/api/v1'
    : 'http://localhost:8100/api/v1'
)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['localhost', '127.0.0.1', 'app-bovedag4.duckdns.org'],
    hmr: isProductionDeployment
      ? {
          protocol: 'wss',
          host: 'app-bovedag4.duckdns.org',
          clientPort: 443
        }
      : true
  }
})
