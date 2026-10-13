import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const workDir = mkdtempSync(join(tmpdir(), 'mdma-mcp-smoke-'));
const packDir = join(workDir, 'pack');
const installDir = join(workDir, 'install');
const cacheDir = join(workDir, 'npm-cache');

const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, npm_config_update_notifier: 'false' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

const expectedToolNames = () =>
  JSON.parse(readFileSync(join(packageDir, 'manifest.json'), 'utf8')).tools.map(
    (tool) => tool.name,
  );

const packTarball = () => {
  mkdirSync(packDir);
  run('pnpm', ['pack', '--pack-destination', packDir], packageDir);
  const tarball = readdirSync(packDir).find((file) => file.endsWith('.tgz'));
  if (!tarball) throw new Error('pnpm pack produced no tarball');
  return join(packDir, tarball);
};

const installTarball = (tarball) => {
  mkdirSync(installDir);
  writeFileSync(join(installDir, 'package.json'), '{"name":"mdma-mcp-smoke","private":true}');
  run(
    'npm',
    [
      'install',
      tarball,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--prefer-online',
      '--loglevel',
      'error',
      '--cache',
      cacheDir,
    ],
    installDir,
  );
};

const importFromInstall = (subpath) =>
  import(
    pathToFileURL(
      join(installDir, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm', subpath),
    ).href
  );

const exerciseServer = async () => {
  const { Client } = await importFromInstall('client/index.js');
  const { StdioClientTransport } = await importFromInstall('client/stdio.js');
  const binPath = join(
    installDir,
    'node_modules',
    '@mobile-reality',
    'mdma-mcp',
    'dist',
    'bin',
    'mdma-mcp.js',
  );
  if (!existsSync(binPath)) throw new Error(`missing ${binPath}`);

  const client = new Client({ name: 'smoke-pack', version: '0.0.0' });
  await client.connect(
    new StdioClientTransport({ command: process.execPath, args: [binPath], cwd: installDir }),
  );
  try {
    const { tools } = await client.listTools();
    const toolNames = tools.map((tool) => tool.name).sort();
    const spec = await client.callTool({ name: 'get-spec', arguments: {} });
    return {
      version: client.getServerVersion()?.version,
      toolNames,
      specIsError: Boolean(spec.isError),
    };
  } finally {
    await client.close();
  }
};

const main = async () => {
  installTarball(packTarball());
  const { version, toolNames, specIsError } = await exerciseServer();
  const expected = expectedToolNames().sort();
  const missing = expected.filter((name) => !toolNames.includes(name));

  console.log(`serverInfo.version: ${version}`);
  console.log(`tools (${toolNames.length}): ${toolNames.join(', ')}`);
  console.log(`get-spec: ${specIsError ? 'error' : 'ok'}`);

  if (missing.length > 0 || specIsError) {
    console.log(`FAIL${missing.length > 0 ? ` missing tools: ${missing.join(', ')}` : ''}`);
    return 1;
  }
  console.log('PASS');
  return 0;
};

let exitCode = 1;
try {
  exitCode = await main();
} catch (error) {
  console.log(`FAIL ${error instanceof Error ? error.message : error}`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
process.exit(exitCode);
