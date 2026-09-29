import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, '.screenshots');
const PORT = Number(process.env.PORT ?? 5190);
const BASE = `http://localhost:${PORT}`;
const T = 10_000;

const failures = [];

async function step(name, fn) {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
    failures.push(`${name}: ${message}`);
    console.log(`  FAIL ${name}: ${message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function startServer() {
  const child = spawn('pnpm', ['exec', 'vite', '--port', String(PORT), '--strictPort'], {
    cwd: HERE,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (d) => {
    output += d;
  });
  child.stderr.on('data', (d) => {
    output += d;
  });
  const exited = new Promise((resolve) => child.on('exit', resolve));
  return { child, exited, output: () => output };
}

async function waitForServer(server) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(`dev server exited early (is port ${PORT} taken?)\n${server.output()}`);
    }
    try {
      const res = await fetch(BASE);
      if (res.ok && server.output().includes(`localhost:${PORT}`)) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`dev server did not start\n${server.output()}`);
}

const logEntries = (page) =>
  page.$$eval('[data-testid="call-log"] li', (items) =>
    items.map((li) => ({
      kind: li.getAttribute('data-kind'),
      source: li.getAttribute('data-source'),
      text: li.textContent ?? '',
    })),
  );

async function open(page, scenario) {
  await page.goto(`${BASE}/#/${scenario}`);
  await page.reload();
}

async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

async function tableScenario(page) {
  console.log('table');
  await open(page, 'table');
  const card = page.locator('.mdma-table[data-component-id="incidents"]');
  const rows = card.locator('tbody tr');

  await step('first load shows the loading state', async () => {
    await page.locator('.mdma-data-loading').first().waitFor({ timeout: T });
    await sleep(250);
    assert((await page.locator('.mdma-data-loading').count()) === 1, 'loading state went away');
    await shot(page, '01-table-first-load');
  });

  await step('initial load renders 10 rows', async () => {
    await rows.first().waitFor({ timeout: T });
    assert((await rows.count()) === 10, `expected 10 rows, got ${await rows.count()}`);
    const log = await logEntries(page);
    assert(
      log.some((e) => e.kind === 'request' && e.source === 'incidents'),
      'no incidents request in call log',
    );
  });

  await step('pagination sits inside the table card', async () => {
    const inside = await card.locator('.mdma-table-pagination').count();
    assert(inside === 1, 'pagination is not a child of the table card');
    const status = await card.locator('.mdma-table-pagination-status').textContent();
    assert(/Page 1 \/ 1000/.test(status ?? ''), `unexpected page status: ${status}`);
    await shot(page, '02-table-loaded');
  });

  await step('next page keeps rows while loading', async () => {
    await card.getByRole('button', { name: 'Next' }).click();
    await page.locator('.mdma-table[aria-busy="true"]').waitFor({ timeout: T });
    assert((await rows.count()) === 10, 'rows disappeared while loading next page');
    await card.locator('.mdma-table-loading-indicator').waitFor({ timeout: T });
    await shot(page, '03-table-reloading');
    await page
      .locator('.mdma-table-pagination-status', { hasText: 'Page 2 /' })
      .waitFor({ timeout: T });
    const log = await logEntries(page);
    assert(
      log.some((e) => e.kind === 'request' && e.text.includes('page=2')),
      'no page=2 request in call log',
    );
  });

  await step('sort click sends a sort request and marks the header', async () => {
    const header = card.locator('th', { hasText: 'Service' });
    await header.click();
    await page.locator('th[aria-sort="ascending"]').waitFor({ timeout: T });
    await page.waitForFunction(
      () => !document.querySelector('.mdma-table[aria-busy="true"]'),
      null,
      { timeout: T },
    );
    const log = await logEntries(page);
    assert(
      log.some((e) => e.kind === 'request' && e.text.includes('sort=service:asc')),
      'no sort=service:asc request in call log',
    );
    await header.click();
    await page.locator('th[aria-sort="descending"]').waitFor({ timeout: T });
    await page.waitForFunction(
      () => !document.querySelector('.mdma-table[aria-busy="true"]'),
      null,
      { timeout: T },
    );
    await shot(page, '04-table-sorted');
  });

  await step('changing service aborts the in-flight request and refetches', async () => {
    const select = page.locator('select');
    await select.selectOption('auth');
    await sleep(350);
    await select.selectOption('billing');
    await page
      .locator('[data-testid="call-log"] li[data-kind="abort"]')
      .first()
      .waitFor({ timeout: T });
    await page.waitForFunction(
      () => !document.querySelector('.mdma-table[aria-busy="true"]'),
      null,
      { timeout: T },
    );
    const services = await card.locator('tbody tr td:nth-child(2)').allTextContents();
    assert(
      services.length > 0 && services.every((s) => s === 'billing'),
      `expected only billing rows, got ${[...new Set(services)].join(',')}`,
    );
    const log = await logEntries(page);
    assert(
      log.some((e) => e.kind === 'request' && e.text.includes('service=billing')),
      'no service=billing request in call log',
    );
    await shot(page, '05-table-filtered');
  });
}

async function errorScenario(page) {
  console.log('error');
  await open(page, 'error');
  const error = page.locator('.mdma-data-error');

  await step('forced error shows message and retry', async () => {
    await error.waitFor({ timeout: T });
    assert(/503/.test((await error.textContent()) ?? ''), 'error message missing');
    await error.getByRole('button', { name: 'Retry' }).waitFor({ timeout: T });
    await shot(page, '06-error');
  });

  await step('retry recovers with rows', async () => {
    await error.getByRole('button', { name: 'Retry' }).click();
    await page.locator('.mdma-table tbody tr').first().waitFor({ timeout: T });
    assert((await error.count()) === 0, 'error still visible after retry');
    await shot(page, '07-error-recovered');
  });
}

async function emptyScenario(page) {
  console.log('empty');
  await open(page, 'empty');
  await step('empty result shows the empty state', async () => {
    await page.locator('.mdma-data-empty').waitFor({ timeout: T });
    await shot(page, '08-empty');
  });
}

async function chartScenario(page) {
  console.log('chart');
  await open(page, 'chart');
  await step('chart renders rows from the source', async () => {
    await page.locator('.mdma-chart .recharts-surface').first().waitFor({ timeout: T });
    const log = await logEntries(page);
    assert(
      log.some((e) => e.kind === 'resolved' && e.source === 'sales'),
      'sales source never resolved',
    );
    await page.locator('.mdma-chart .recharts-line-curve').first().waitFor({ timeout: T });
    assert(
      (await page.locator('.mdma-chart table').count()) === 0,
      'chart card contains a fallback table',
    );
    await sleep(600);
    await shot(page, '09-chart');
  });
}

async function main() {
  await rm(SHOTS, { recursive: true, force: true });
  await mkdir(SHOTS, { recursive: true });

  const server = startServer();
  let browser;
  try {
    await waitForServer(server);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await tableScenario(page);
    await errorScenario(page);
    await emptyScenario(page);
    await chartScenario(page);

    if (pageErrors.length > 0) failures.push(`page errors: ${pageErrors.join(' | ')}`);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  } finally {
    await browser?.close();
    server.child.kill('SIGTERM');
    await Promise.race([server.exited, sleep(3000)]);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} failure(s):`);
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log(`\nall scenarios passed. screenshots: ${SHOTS}`);
}

main();
