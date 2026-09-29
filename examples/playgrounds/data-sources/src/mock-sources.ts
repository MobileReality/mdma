import type { DataRequest, DataResolver, DataResult } from '@mobile-reality/mdma-runtime';
import { logCall } from './call-log.js';

export const LATENCY_MS = 600;

export const SERVICES = ['auth', 'billing', 'checkout', 'notifications', 'search'] as const;
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const TITLES = [
  'Elevated error rate',
  'Slow responses',
  'Queue backlog growing',
  'Failed health check',
  'Certificate nearing expiry',
  'Unexpected 5xx spike',
];

export interface Incident {
  id: number;
  service: string;
  severity: string;
  title: string;
  opened: string;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildIncidents(count: number): Incident[] {
  const rand = mulberry32(42);
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)] as T;
  const start = Date.UTC(2026, 0, 1);
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    service: pick(SERVICES),
    severity: pick(SEVERITIES),
    title: pick(TITLES),
    opened: new Date(start + i * 3_600_000).toISOString().slice(0, 16).replace('T', ' '),
  }));
}

const INCIDENTS = buildIncidents(10_000);

const SALES = [
  ['Jan', 42, 40],
  ['Feb', 47, 42],
  ['Mar', 55, 46],
  ['Apr', 51, 50],
  ['May', 63, 54],
  ['Jun', 68, 58],
  ['Jul', 72, 62],
  ['Aug', 70, 66],
  ['Sep', 78, 70],
  ['Oct', 85, 74],
  ['Nov', 91, 78],
  ['Dec', 104, 84],
].map(([month, revenue, target]) => ({ month, revenue, target }));

function abortError() {
  return new DOMException('Request aborted', 'AbortError');
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function describe(req: DataRequest): string {
  const parts: string[] = [];
  const service = req.params.service;
  if (service !== undefined) parts.push(`service=${String(service)}`);
  if (req.page !== undefined) parts.push(`page=${req.page}`);
  if (req.pageSize !== undefined) parts.push(`pageSize=${req.pageSize}`);
  if (req.sort) parts.push(`sort=${req.sort.key}:${req.sort.direction}`);
  if (req.filter) parts.push(`filter=${req.filter}`);
  return parts.join(' ') || '-';
}

function instrument(
  source: string,
  handler: (req: DataRequest) => DataResult | Promise<DataResult>,
): DataResolver {
  return async (req, { signal }) => {
    logCall('request', source, describe(req));
    try {
      await delay(LATENCY_MS, signal);
      const result = await handler(req);
      logCall('resolved', source, `${result.rows.length} rows`);
      return result;
    } catch (error) {
      if (signal.aborted) logCall('abort', source, describe(req));
      else logCall('error', source, error instanceof Error ? error.message : String(error));
      throw error;
    }
  };
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function queryIncidents(req: DataRequest): DataResult {
  const service = req.params.service;
  let rows: Incident[] =
    typeof service === 'string' && service !== '' && service !== 'all'
      ? INCIDENTS.filter((row) => row.service === service)
      : INCIDENTS;

  if (req.filter) {
    const needle = req.filter.toLowerCase();
    rows = rows.filter((row) => row.title.toLowerCase().includes(needle));
  }

  if (req.sort) {
    const { key, direction } = req.sort;
    const sign = direction === 'desc' ? -1 : 1;
    rows = [...rows].sort(
      (a, b) => sign * compare(a[key as keyof Incident], b[key as keyof Incident]),
    );
  }

  const total = rows.length;
  const pageSize = req.pageSize ?? 10;
  const start = ((req.page ?? 1) - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total };
}

export function createMockSources() {
  let flakyAttempts = 0;

  return {
    services: [
      { label: 'All services', value: 'all' },
      ...SERVICES.map((service) => ({ label: service, value: service })),
    ],
    incidents: instrument('incidents', queryIncidents),
    sales: instrument('sales', () => ({ rows: SALES, total: SALES.length })),
    empty: instrument('empty', () => ({ rows: [], total: 0 })),
    flaky: instrument('flaky', (req) => {
      flakyAttempts += 1;
      if (flakyAttempts === 1) throw new Error('Upstream incidents API returned 503');
      return queryIncidents(req);
    }),
  };
}
