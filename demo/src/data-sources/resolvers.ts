import type { DataRequest, DataResolver, DataResult } from '@mobile-reality/mdma-runtime';
import { COUNTRIES } from './countries-data.js';
import { salesForYear } from './sales-data.js';
import { INCIDENTS, type Incident, isIncidentKey } from './seeded-incidents.js';

export const INCIDENTS_LATENCY_MS = 250;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SALES_YEAR = 2026;

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

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function isActiveParam(value: unknown): value is string {
  return typeof value === 'string' && value !== '' && value !== 'all';
}

function matchesFilter(incident: Incident, needle: string): boolean {
  return [incident.id, incident.title, incident.service].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

export function queryIncidents(req: DataRequest): DataResult<Incident> {
  const { status, service } = req.params;
  let rows: readonly Incident[] = INCIDENTS;

  if (isActiveParam(status)) rows = rows.filter((row) => row.status === status);
  if (isActiveParam(service)) rows = rows.filter((row) => row.service === service);
  if (req.filter) {
    const needle = req.filter.toLowerCase();
    rows = rows.filter((row) => matchesFilter(row, needle));
  }

  if (req.sort && isIncidentKey(req.sort.key)) {
    const { key, direction } = req.sort;
    const sign = direction === 'desc' ? -1 : 1;
    rows = [...rows].sort((a, b) => sign * compare(a[key], b[key]));
  }

  const pageSize = req.pageSize ?? DEFAULT_PAGE_SIZE;
  const start = ((req.page ?? 1) - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total: rows.length };
}

export const resolveIncidents: DataResolver = async (req, { signal }) => {
  await delay(INCIDENTS_LATENCY_MS, signal);
  return queryIncidents(req);
};

export const resolveCountries: DataResolver = async ({ params }) => {
  const region = isActiveParam(params.region) ? params.region : undefined;
  const rows = COUNTRIES.filter((country) => !region || country.region === region).map(
    ({ label, value }) => ({ label, value }),
  );
  return { rows, total: rows.length };
};

export const resolveSalesByMonth: DataResolver = async ({ params }) => {
  const year = Number(params.year ?? DEFAULT_SALES_YEAR);
  const rows = salesForYear(Number.isFinite(year) ? year : DEFAULT_SALES_YEAR);
  return { rows, total: rows.length };
};
