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
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          }
        },
        '/api/agentrouter': {
          target: 'https://agentrouter.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/agentrouter/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
              
              // Spoof standard node.js client (like Roo Code / Cline) to bypass browser checks
              proxyReq.setHeader('User-Agent', 'axios/1.7.9');
              
              Object.keys(req.headers).forEach(key => {
                const lower = key.toLowerCase();
                if (lower.startsWith('sec-') || lower.startsWith('accept-language')) {
                  proxyReq.removeHeader(key);
                }
              });
            });
          }
        },
        '/api/openrouter': {
          target: 'https://openrouter.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openrouter/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
              proxyReq.setHeader('HTTP-Referer', 'https://novel-weaver.app');
              proxyReq.setHeader('X-Title', 'Novel Weaver AI');
              
              Object.keys(req.headers).forEach(key => {
                const lower = key.toLowerCase();
                if (lower.startsWith('sec-') || lower.startsWith('accept-language')) {
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