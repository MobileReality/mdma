import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import open from 'open';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export async function startDevServer(port: number): Promise<void> {
  const appRoot = path.resolve(__dirname, '../../app-dist');

  const server = createHttpServer(async (req, res) => {
    let urlPath = req.url?.split('?')[0] ?? '/';
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(appRoot, urlPath);

    // Prevent path traversal
    if (!filePath.startsWith(appRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    try {
      const data = await readFile(filePath);
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(data);
    } catch {
      // SPA fallback — serve index.html for unknown routes
      try {
        const index = await readFile(path.join(appRoot, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(index);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    }
  });

  server.listen(port, () => {
    open(`http://localhost:${port}`);
  });

  // Keep the process alive
  await new Promise(() => {});
}
