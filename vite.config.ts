import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server: any) {
      // Load .env.local into process.env if present
      const envPath = path.resolve(__dirname, '.env.local');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const eq = trimmed.indexOf('=');
          if (eq !== -1) {
            const key = trimmed.slice(0, eq).trim();
            const val = trimmed.slice(eq + 1).trim();
            if (!process.env[key]) process.env[key] = val;
          }
        });
      }

      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];
        if (url === '/api/chat' || url === '/api/extract-notes') {
          if (req.method === 'OPTIONS') {
            res.writeHead(200, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            });
            res.end();
            return;
          }

          try {
            const handler = url === '/api/chat'
              ? (await import('./api/chat.js')).default
              : (await import('./api/extract-notes.js')).default;

            const chunks: any[] = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = Buffer.concat(chunks);

            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const host = req.headers.host || 'localhost:3006';
            const webRequest = new Request(`${protocol}://${host}${req.url}`, {
              method: req.method,
              headers: req.headers,
              body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
            });

            const response = await handler(webRequest);
            res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
            if (response.body) {
              const reader = response.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
              }
            }
            res.end();
          } catch (err: any) {
            console.error('[API Middleware Error]:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
          }
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  server: {
    port: 3006,
    host: '0.0.0.0',
  },
  plugins: [react(), apiDevMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});