import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startDevServer(port: number): Promise<void> {
  const appRoot = path.resolve(__dirname, '../../app');

  const server = await createServer({
    root: appRoot,
    configFile: path.resolve(appRoot, 'vite.config.ts'),
    server: {
      port,
      open: true,
    },
  });

  await server.listen();
  server.printUrls();
}
