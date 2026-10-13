import type { DataRequest, DataResolver, DataResult } from '@mobile-reality/mdma-runtime';
import { COUNTRIES } from './countries-data.js';
import { salesForYear } from './sales-data.js';
import { INCIDENTS, type Incident } from './seeded-incidents.js';

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

interface ListQueryOptions<T> {
  searchKeys: readonly (keyof T)[];
  defaultPageSize?: number;
}

function applyListQuery<T extends object>(
  rows: readonly T[],
  req: DataRequest,
  { searchKeys, defaultPageSize }: ListQueryOptions<T>,
): DataResult<T> {
  let result = [...rows];

  if (req.filter) {
    const needle = req.filter.toLowerCase();
    result = result.filter((row) =>
      searchKeys.some((key) => String(row[key]).toLowerCase().includes(needle)),
    );
  }

  if (req.sort && result.length > 0 && Object.hasOwn(result[0], req.sort.key)) {
    const key = req.sort.key as keyof T;
    const sign = req.sort.direction === 'desc' ? -1 : 1;
    result.sort((a, b) => sign * compare(a[key], b[key]));
  }

  const pageSize = req.pageSize ?? defaultPageSize;
  if (pageSize === undefined) return { rows: result, total: result.length };
  const start = ((req.page ?? 1) - 1) * pageSize;
  return { rows: result.slice(start, start + pageSize), total: result.length };
}

export function queryIncidents(req: DataRequest): DataResult<Incident> {
  const { status, service } = req.params;
  let rows: readonly Incident[] = INCIDENTS;

  if (isActiveParam(status)) rows = rows.filter((row) => row.status === status);
  if (isActiveParam(service)) rows = rows.filter((row) => row.service === service);

  return applyListQuery(rows, req, {
    searchKeys: ['id', 'title', 'service'],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });
}

export const resolveIncidents: DataResolver = async (req, { signal }) => {
  await delay(INCIDENTS_LATENCY_MS, signal);
  return queryIncidents(req);
};

export const resolveCountries: DataResolver = async (req) => {
  const region = isActiveParam(req.params.region) ? req.params.region : undefined;
  const rows = COUNTRIES.filter((country) => !region || country.region === region).map(
    ({ label, value }) => ({ label, value }),
  );
  return applyListQuery(rows, req, { searchKeys: ['label', 'value'] });
};

export const resolveSalesByMonth: DataResolver = async (req) => {
  const year = Number(req.params.year ?? DEFAULT_SALES_YEAR);
  const rows = salesForYear(Number.isFinite(year) ? year : DEFAULT_SALES_YEAR);
  return applyListQuery(rows, req, { searchKeys: ['month', 'revenue', 'orders'] });
};

export const resolveSalesRecords: DataResolver = resolveSalesByMonth;
