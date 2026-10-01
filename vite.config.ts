import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import { createFileStore } from './src/attendance/fileStore';
import { handleAttendance } from './src/attendance/http';

function attendanceDevApi(adminPin: string): Plugin {
  const store = createFileStore(path.resolve('data/attendance.json'));
  return {
    name: 'attendance-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api')) {
          next();
          return;
        }
        try {
          const request = await nodeRequest(req);
          const response = await handleAttendance(request, store, adminPin);
          await writeResponse(res, response);
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'The invitation list could not be read.' }));
        }
      });
    },
  };
}

function nodeRequest(req: IncomingMessage): Promise<Request> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(', '));
      }
      const method = req.method ?? 'GET';
      const body = method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks);
      resolve(new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, { method, headers, body }));
    });
    req.on('error', reject);
  });
}

async function writeResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), attendanceDevApi(env.ADMIN_PIN ?? '')],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
