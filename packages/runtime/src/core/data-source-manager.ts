import { indexDataSources } from '@mobile-reality/mdma-spec';
import type {
  DataSourceDefinition,
  DataSourceResolver,
  DataSourceRequest,
  DataSourceResult,
  DataSourceSort,
  DataSourceSortDirection,
} from '@mobile-reality/mdma-spec';
import { resolveValue } from './binding-resolver.js';

export type DataSortDirection = DataSourceSortDirection;
export type DataSort = DataSourceSort;
export type DataRequest = DataSourceRequest;
export type DataResult<TRow = unknown> = DataSourceResult<TRow>;
export type DataResolver = DataSourceResolver;

export type DataSourceEntry = unknown[] | DataResolver;

export type DataSourceMap = Record<string, DataSourceEntry>;

export type DataSourceInput = DataSourceMap | readonly DataSourceDefinition[];

export function toDataSourceMap(input: DataSourceInput | undefined): DataSourceMap | undefined {
  if (!input || !Array.isArray(input)) return input as DataSourceMap | undefined;
  const map: DataSourceMap = {};
  for (const [name, definition] of Object.entries(indexDataSources(input))) {
    map[name] =
      definition.resolve ??
      (async () => {
        throw new Error(`No resolver registered for data source "${name}"`);
      });
  }
  return map;
}

export type DataStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DataSlotState {
  status: DataStatus;
  rows: unknown[];
  total?: number;
  page: number;
  pageSize?: number;
  sort?: DataSort;
  filter?: string;
  error?: string;
}

interface DataSlot {
  key: string;
  ref: { source: string; params?: Record<string, unknown> };
  pageSize?: number;
  state: DataSlotState;
  resolvedParams: Record<string, unknown>;
  fetchToken: number;
  abortController?: AbortController;
  debounceTimer?: ReturnType<typeof setTimeout>;
}

export interface DataSourceManagerOptions {
  dataSources?: DataSourceMap;
  debounceMs?: number;
  onLog?: (event: {
    key: string;
    eventType: 'data_loading' | 'data_resolved' | 'data_error';
    payload: Record<string, unknown>;
  }) => void;
  onChange?: () => void;
}

function resolveParams(
  params: Record<string, unknown> | undefined,
  bindings: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  if (!params) return resolved;
  for (const [key, value] of Object.entries(params)) {
    resolved[key] = resolveValue(value, bindings);
  }
  return resolved;
}

function refsEqual(
  a: { source: string; params?: Record<string, unknown> },
  b: { source: string; params?: Record<string, unknown> },
): boolean {
  return a.source === b.source && JSON.stringify(a.params ?? {}) === JSON.stringify(b.params ?? {});
}

function paramsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => Object.is(a[k], b[k]));
}

function cacheKey(source: string, req: DataRequest): string {
  return JSON.stringify([
    source,
    req.params,
    req.page ?? null,
    req.pageSize ?? null,
    req.sort ?? null,
    req.filter ?? null,
  ]);
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function applyInMemory(rows: unknown[], req: DataRequest): DataResult {
  let result = rows.slice();

  if (req.filter) {
    const needle = req.filter.toLowerCase();
    result = result.filter((row) =>
      Object.values(row as Record<string, unknown>).some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(needle),
      ),
    );
  }

  if (req.sort) {
    const { key, direction } = req.sort;
    result.sort((a, b) => {
      const cmp = compareValues(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      );
      return direction === 'desc' ? -cmp : cmp;
    });
  }

  const total = result.length;

  if (req.page !== undefined && req.pageSize) {
    const start = (req.page - 1) * req.pageSize;
    result = result.slice(start, start + req.pageSize);
  }

  return { rows: result, total };
}

export class DataSourceManager {
  private readonly dataSources: DataSourceMap;
  private readonly debounceMs: number;
  private readonly onLog: DataSourceManagerOptions['onLog'];
  private readonly onChange: DataSourceManagerOptions['onChange'];
  private readonly slots = new Map<string, DataSlot>();
  private deferredKeys: Set<string> | undefined;
  private batchDepth = 0;
  private readonly cache = new Map<
    string,
    { promise: Promise<DataResult>; controller: AbortController; refCount: number }
  >();

  constructor(options: DataSourceManagerOptions = {}) {
    this.dataSources = options.dataSources ?? {};
    this.debounceMs = options.debounceMs ?? 150;
    this.onLog = options.onLog;
    this.onChange = options.onChange;
  }

  has(key: string): boolean {
    return this.slots.has(key);
  }

  keys(): string[] {
    return [...this.slots.keys()];
  }

  register(
    key: string,
    ref: { source: string; params?: Record<string, unknown> },
    bindings: Record<string, unknown>,
    options: { pageSize?: number } = {},
  ): void {
    if (this.slots.has(key)) return;
    const resolvedParams = resolveParams(ref.params, bindings);
    const slot: DataSlot = {
      key,
      ref,
      pageSize: options.pageSize,
      resolvedParams,
      fetchToken: 0,
      state: {
        status: 'idle',
        rows: [],
        page: 1,
        pageSize: options.pageSize,
      },
    };
    this.slots.set(key, slot);
    this.requestFetch(slot);
  }

  hasSource(name: string): boolean {
    return Object.hasOwn(this.dataSources, name);
  }

  beginBatch(): void {
    if (this.batchDepth++ === 0) this.deferredKeys = new Set();
  }

  endBatch(bindings: Record<string, unknown>): void {
    if (this.batchDepth === 0) return;
    if (--this.batchDepth > 0) return;
    const deferred = this.deferredKeys ?? new Set<string>();
    this.deferredKeys = undefined;
    for (const key of deferred) {
      const slot = this.slots.get(key);
      if (!slot) continue;
      slot.resolvedParams = resolveParams(slot.ref.params, bindings);
      this.fetch(slot);
    }
    this.onBindingsChanged(bindings);
  }

  runBatch<T>(bindings: Record<string, unknown>, fn: () => T): T {
    this.beginBatch();
    let result: T;
    try {
      result = fn();
    } catch (error) {
      try {
        this.endBatch(bindings);
      } catch {
        // an endBatch failure must not mask the callback's error
      }
      throw error;
    }
    this.endBatch(bindings);
    return result;
  }

  sync(
    key: string,
    ref: { source: string; params?: Record<string, unknown> },
    bindings: Record<string, unknown>,
    options: { pageSize?: number } = {},
  ): void {
    const slot = this.slots.get(key);
    if (!slot) {
      this.register(key, ref, bindings, options);
      return;
    }
    if (refsEqual(slot.ref, ref) && slot.pageSize === options.pageSize) return;
    slot.ref = ref;
    slot.pageSize = options.pageSize;
    slot.resolvedParams = resolveParams(ref.params, bindings);
    slot.state = { ...slot.state, page: 1, pageSize: options.pageSize };
    this.requestFetch(slot);
  }

  unregister(key: string): void {
    const slot = this.slots.get(key);
    if (!slot) return;
    slot.fetchToken++;
    slot.abortController?.abort();
    if (slot.debounceTimer) clearTimeout(slot.debounceTimer);
    this.deferredKeys?.delete(key);
    this.slots.delete(key);
  }

  getState(key: string): DataSlotState | undefined {
    return this.slots.get(key)?.state;
  }

  setPage(key: string, page: number): void {
    const slot = this.slots.get(key);
    if (!slot) return;
    slot.state = { ...slot.state, page };
    this.fetch(slot);
  }

  setSort(key: string, sort: DataSort | undefined): void {
    const slot = this.slots.get(key);
    if (!slot) return;
    slot.state = { ...slot.state, sort, page: 1 };
    this.fetch(slot);
  }

  setFilter(key: string, filter: string | undefined): void {
    const slot = this.slots.get(key);
    if (!slot) return;
    slot.state = { ...slot.state, filter, page: 1 };
    this.fetch(slot);
  }

  retry(key: string): void {
    const slot = this.slots.get(key);
    if (!slot) return;
    this.fetch(slot);
  }

  onBindingsChanged(bindings: Record<string, unknown>): void {
    for (const slot of this.slots.values()) {
      const resolved = resolveParams(slot.ref.params, bindings);
      if (paramsEqual(resolved, slot.resolvedParams)) continue;
      slot.resolvedParams = resolved;
      slot.state = { ...slot.state, page: 1 };
      this.scheduleFetch(slot);
    }
  }

  async resolveAll(): Promise<void> {
    await Promise.all([...this.slots.values()].map((slot) => this.fetch(slot)));
  }

  private requestFetch(slot: DataSlot): void {
    if (this.deferredKeys) this.deferredKeys.add(slot.key);
    else this.fetch(slot);
  }

  private scheduleFetch(slot: DataSlot): void {
    if (slot.debounceTimer) clearTimeout(slot.debounceTimer);
    slot.abortController?.abort();
    slot.debounceTimer = setTimeout(() => {
      slot.debounceTimer = undefined;
      this.fetch(slot);
    }, this.debounceMs);
  }

  private async fetch(slot: DataSlot): Promise<void> {
    if (slot.debounceTimer) {
      clearTimeout(slot.debounceTimer);
      slot.debounceTimer = undefined;
    }
    slot.abortController?.abort();
    const controller = new AbortController();
    slot.abortController = controller;
    const token = ++slot.fetchToken;

    const entry = this.dataSources[slot.ref.source];
    if (entry === undefined) {
      slot.state = {
        ...slot.state,
        status: 'error',
        error: `Unknown data source "${slot.ref.source}"`,
      };
      this.log(slot, 'data_error', { error: slot.state.error, source: slot.ref.source });
      this.onChange?.();
      return;
    }

    slot.state = { ...slot.state, status: 'loading', error: undefined };
    this.onChange?.();
    // param values may be sensitive: log keys only, so the event skips the redactor
    this.log(slot, 'data_loading', {
      source: slot.ref.source,
      paramKeys: Object.keys(slot.resolvedParams),
    });

    const request: DataRequest = {
      source: slot.ref.source,
      params: slot.resolvedParams,
      page: slot.state.page,
      pageSize: slot.pageSize,
      sort: slot.state.sort,
      filter: slot.state.filter,
    };

    try {
      const result = Array.isArray(entry)
        ? applyInMemory(entry, request)
        : await this.fetchViaResolver(entry, request, controller.signal);

      if (token !== slot.fetchToken) return;

      slot.state = {
        ...slot.state,
        status: 'ready',
        rows: result.rows,
        total: result.total,
        error: undefined,
      };
      this.log(slot, 'data_resolved', {
        source: slot.ref.source,
        rowCount: result.rows.length,
        total: result.total,
      });
      this.onChange?.();
    } catch (err) {
      if (controller.signal.aborted) return;
      if (token !== slot.fetchToken) return;
      const message = err instanceof Error ? err.message : String(err);
      slot.state = { ...slot.state, status: 'error', error: message };
      this.log(slot, 'data_error', { source: slot.ref.source, error: message });
      this.onChange?.();
    }
  }

  private async fetchViaResolver(
    resolver: DataResolver,
    request: DataRequest,
    callerSignal: AbortSignal,
  ): Promise<DataResult> {
    const key = cacheKey(request.source, request);
    let entry = this.cache.get(key);
    // an aborted entry is evicted in a microtask and can still be cached; joining it would never resolve
    if (entry?.controller.signal.aborted) entry = undefined;

    if (!entry) {
      const controller = new AbortController();
      const promise = resolver(request, { signal: controller.signal }).then((result) => {
        if (result.total === undefined) {
          return applyInMemory(result.rows, { ...request, params: {} });
        }
        return result;
      });
      entry = { promise, controller, refCount: 0 };
      this.cache.set(key, entry);
      // callers observe rejections via entry.promise; this chain only evicts, so it must swallow them
      promise
        .catch(() => {})
        .finally(() => {
          if (this.cache.get(key) === entry) this.cache.delete(key);
        });
    }

    const current = entry;
    current.refCount++;
    // other slots may share this in-flight request, so only the last caller aborting cancels it
    const onCallerAbort = () => {
      current.refCount--;
      if (current.refCount <= 0) current.controller.abort();
    };
    callerSignal.addEventListener('abort', onCallerAbort);
    try {
      return await current.promise;
    } finally {
      callerSignal.removeEventListener('abort', onCallerAbort);
    }
  }

  private log(
    slot: DataSlot,
    eventType: 'data_loading' | 'data_resolved' | 'data_error',
    payload: Record<string, unknown>,
  ): void {
    this.onLog?.({ key: slot.key, eventType, payload });
  }
}
