import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import expressApp from './backend/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'express-backend',
        configureServer(server) {
          // Mount Express app in dev mode
          server.middlewares.use(expressApp);

          // Ensure both 5157 and 3000 are always accessible:
          // If Vite runs on 5157 (local VS Code), bridge 3000 -> 5157.
          // If Vite runs on 3000 (container environment), bridge 5157 -> 3000.
          server.httpServer?.once('listening', () => {
            const address = server.httpServer?.address();
            const currentPort = typeof address === 'object' && address ? address.port : 5157;
            const targetBridgePort = currentPort === 5157 ? 3000 : 5157;

            try {
              const bridge = http.createServer((req, res) => {
                const forwardReq = http.request(
                  {
                    hostname: '127.0.0.1',
                    port: currentPort,
                    path: req.url,
                    method: req.method,
                    headers: req.headers,
                  },
                  (forwardRes) => {
                    res.writeHead(forwardRes.statusCode, forwardRes.headers);
                    forwardRes.pipe(res, { end: true });
                  }
                );
                forwardReq.on('error', () => {
                  res.writeHead(502);
                  res.end('Bridge connecting...');
                });
                req.pipe(forwardReq, { end: true });
              });

              bridge.on('error', () => {
                // Target bridge port already in use or restricted, ignore safely
              });

              bridge.listen(targetBridgePort, '0.0.0.0', () => {
                console.log(`[Women Safety] Port bridge listening on http://localhost:${targetBridgePort} -> http://localhost:${currentPort}`);
              });
            } catch (err) {
              // Ignore bridge initialization error
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5157,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
