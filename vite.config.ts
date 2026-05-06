import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3006,
      host: '0.0.0.0',
      proxy: {
        '/api/agentrouter': {
          target: 'https://agentrouter.org',
          changeOrigin: true,
          xfwd: false,
          rewrite: (path) => path.replace(/^\/api\/agentrouter/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.setHeader('User-Agent', 'undici');
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
              Object.keys(req.headers).forEach(key => {
                if (key.toLowerCase().startsWith('sec-') || key.toLowerCase().startsWith('accept-')) {
                  proxyReq.removeHeader(key);
                }
              });
            });
          }
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});