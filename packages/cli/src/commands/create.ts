import chalk from 'chalk';
import getPort from 'get-port';
import { startDevServer } from '../server/dev-server.js';

interface CreateOptions {
  port?: string;
}

export async function createCommand(options: CreateOptions): Promise<void> {
  const port = options.port ? Number.parseInt(options.port, 10) : await getPort({ port: 4200 });

  console.log(chalk.bold('\n  MDMA Prompt Builder\n'));
  console.log(chalk.dim('  Starting web app...\n'));

  await startDevServer(port);

  console.log(chalk.green(`\n  Ready at http://localhost:${port}\n`));
  console.log(chalk.dim('  Press Ctrl+C to stop.\n'));
}
