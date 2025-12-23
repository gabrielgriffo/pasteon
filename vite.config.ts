import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Use VITE_API_URL for backend
  // In Docker, this should be 'http://backend:3001' (service name)
  // For local dev, use 'http://localhost:3001'
  const backendUrl = env.VITE_API_URL || 'http://localhost:3001';

  // Use VITE_API_TARGET for external API proxy (e.g., D&B API)
  const externalApiTarget = env.VITE_API_TARGET || 'https://usapi.spearwatch.com';

  console.log('🔧 Vite Config:');
  console.log('  Backend URL:', backendUrl);
  console.log('  External API Target:', externalApiTarget);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        // Proxy para backend local (endpoints, groups, etc.)
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        // Proxy para API externa (requests do API Tester)
        '/external-api': {
          target: externalApiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/external-api/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Remove headers que podem causar erro 403 (CORS)
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
              proxyReq.removeHeader('sec-fetch-site');
              proxyReq.removeHeader('sec-fetch-mode');
              proxyReq.removeHeader('sec-fetch-dest');

              console.log('📡 Proxy Request:', {
                method: req.method,
                url: req.url,
                targetUrl: options.target + proxyReq.path,
                headers: proxyReq.getHeaders(),
              });
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('📥 Proxy Response:', {
                status: proxyRes.statusCode,
                statusMessage: proxyRes.statusMessage,
                headers: proxyRes.headers,
              });
            });
          }
        }
      }
    }
  }
})
