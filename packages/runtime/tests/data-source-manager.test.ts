import { describe, it, expect, vi } from 'vitest';
import { createDocumentStore } from '../src/core/document-store.js';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DataRequest, DataResult } from '../src/core/data-source-manager.js';

function makeAst(components: Array<Record<string, unknown>>): MdmaRoot {
  return {
    type: 'root',
    children: components.map((comp) => ({
      type: 'mdmaBlock' as const,
      rawYaml: '',
      component: comp,
    })),
  } as unknown as MdmaRoot;
}

function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: i, name: `Row ${i}` }));
}

function tableAst(pageSize = 20) {
  return makeAst([
    {
      id: 'filters',
      type: 'form',
      sensitive: false,
      disabled: false,
      visible: true,
      onSubmit: 'apply',
      fields: [{ name: 'service', type: 'text', label: 'Service' }],
    },
    {
      id: 'accounts',
      type: 'table',
      sensitive: false,
      disabled: false,
      visible: true,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
      ],
      pageSize,
      data: { source: 'accounts', params: { service: '{{filters.service}}' } },
    },
  ]);
}

describe('DataSourceManager via DocumentStore', () => {
  it('fetches 1000 rows with total, paginates, and aborts + refetches when a bound param changes', async () => {
    const allRows = makeRows(1000);
    const calls: DataRequest[] = [];
    const abortedSignals: AbortSignal[] = [];
    let resolveSecondCall: ((result: DataResult) => void) | undefined;

    const resolver = vi.fn(async (req: DataRequest, ctx: { signal: AbortSignal }) => {
      calls.push(req);
      abortedSignals.push(ctx.signal);
      if (calls.length === 1) {
        const start = ((req.page ?? 1) - 1) * (req.pageSize ?? 20);
        return {
          rows: allRows.slice(start, start + (req.pageSize ?? 20)),
          total: allRows.length,
        };
      }
      return new Promise<DataResult>((resolve) => {
        resolveSecondCall = resolve;
      });
    });

    const store = createDocumentStore(tableAst(20), {
      dataSources: { accounts: resolver },
    });

    await vi.waitFor(() => {
      const state = store.getDataState('accounts');
      expect(state?.status).toBe('ready');
    });

    expect(store.getDataState('accounts')?.rows).toHaveLength(20);
    expect(store.getDataState('accounts')?.total).toBe(1000);

    store.setDataPage('accounts', 2);
    await vi.waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });
    expect(calls[1].page).toBe(2);

    store.dispatch({
      type: 'FIELD_CHANGED',
      componentId: 'filters',
      field: 'service',
      value: 'billing',
    });

    await vi.waitFor(
      () => {
        expect(abortedSignals[1]?.aborted).toBe(true);
      },
      { timeout: 1000 },
    );

    await vi.waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(3);
    });
    expect(calls[2].params.service).toBe('billing');

    resolveSecondCall?.({ rows: allRows.slice(0, 20), total: 1000 });
  });

  it('goes to an error state for an unknown source, not a silent empty list', async () => {
    const store = createDocumentStore(tableAst());
    await vi.waitFor(() => {
      expect(store.getDataState('accounts')?.status).toBe('error');
    });
    expect(store.getDataState('accounts')?.error).toMatch(/unknown data source/i);
  });

  it('retryData re-runs a failed fetch', async () => {
    let attempt = 0;
    const resolver = vi.fn(async (): Promise<DataResult> => {
      attempt++;
      if (attempt === 1) throw new Error('boom');
      return { rows: [{ id: 1, name: 'ok' }], total: 1 };
    });

    const store = createDocumentStore(tableAst(), { dataSources: { accounts: resolver } });

    await vi.waitFor(() => {
      expect(store.getDataState('accounts')?.status).toBe('error');
    });

    store.retryData('accounts');

    await vi.waitFor(() => {
      expect(store.getDataState('accounts')?.status).toBe('ready');
    });
    expect(store.getDataState('accounts')?.rows).toHaveLength(1);
  });

  it('resolveAllData resolves every registered source once', async () => {
    const resolver = vi.fn(async (): Promise<DataResult> => ({ rows: [{ id: 1 }], total: 1 }));
    const store = createDocumentStore(tableAst(), { dataSources: { accounts: resolver } });

    await store.resolveAllData();

    expect(store.getDataState('accounts')?.status).toBe('ready');
  });

  it('does not end in error when re-fetching an already-loading slot with a signal-honouring resolver', async () => {
    let call = 0;
    const resolver = vi.fn(
      (_req: DataRequest, ctx: { signal: AbortSignal }) =>
        new Promise<DataResult>((resolve, reject) => {
          call++;
          const thisCall = call;
          ctx.signal.addEventListener('abort', () => reject(new Error(`call ${thisCall} aborted`)));
          if (thisCall > 1) resolve({ rows: [{ id: 1 }], total: 1 });
        }),
    );

    const store = createDocumentStore(tableAst(), { dataSources: { accounts: resolver } });

    expect(store.getDataState('accounts')?.status).toBe('loading');

    // resolveAllData re-fetches every registered slot, including one already mid-flight —
    // this must not join the just-aborted in-flight request and fail with it.
    await store.resolveAllData();

    expect(store.getDataState('accounts')?.status).toBe('ready');
    expect(call).toBe(2);
  });

  it('registers select-options data slots keyed by componentId.fieldName', async () => {
    const ast = makeAst([
      {
        id: 'intake',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        onSubmit: 'submit',
        fields: [
          {
            name: 'country',
            type: 'select',
            label: 'Country',
            options: { source: 'countries' },
          },
        ],
      },
    ]);

    const store = createDocumentStore(ast, {
      dataSources: {
        countries: [
          { label: 'Poland', value: 'PL' },
          { label: 'Germany', value: 'DE' },
        ],
      },
    });

    await vi.waitFor(() => {
      expect(store.getDataState('intake.country')?.status).toBe('ready');
    });
    expect(store.getDataState('intake.country')?.rows).toEqual([
      { label: 'Poland', value: 'PL' },
      { label: 'Germany', value: 'DE' },
    ]);
  });

  it('resolves a data ref against a new component default seeded in the same updateAst pass', async () => {
    const calls: DataRequest[] = [];
    const resolver = vi.fn(async (req: DataRequest): Promise<DataResult> => {
      calls.push(req);
      return { rows: [{ label: 'Warsaw', value: 'WAW' }], total: 1 };
    });

    const ast = makeAst([
      {
        id: 'intake',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        onSubmit: 'submit',
        fields: [
          { name: 'country', type: 'select', label: 'Country', defaultValue: 'PL' },
          {
            name: 'city',
            type: 'select',
            label: 'City',
            options: { source: 'cities', params: { country: '{{intake.country}}' } },
          },
        ],
      },
    ]);

    const store = createDocumentStore(makeAst([]), { dataSources: { cities: resolver } });
    store.updateAst(ast);

    await vi.waitFor(() => {
      expect(store.getDataState('intake.city')?.status).toBe('ready');
    });
    expect(calls[0]?.params.country).toBe('PL');
  });

  it('resolves a data ref that binds to a component appearing later in the document', async () => {
    const calls: DataRequest[] = [];
    const resolver = vi.fn(async (req: DataRequest): Promise<DataResult> => {
      calls.push(req);
      return { rows: [{ id: 1 }], total: 1 };
    });

    const ast = makeAst([
      {
        id: 'accounts',
        type: 'table',
        sensitive: false,
        disabled: false,
        visible: true,
        columns: [{ key: 'id', header: 'ID' }],
        data: { source: 'accounts', params: { region: '{{filters.region}}' } },
      },
      {
        id: 'filters',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        onSubmit: 'apply',
        fields: [{ name: 'region', type: 'select', label: 'Region', defaultValue: 'eu' }],
      },
    ]);

    const store = createDocumentStore(ast, { dataSources: { accounts: resolver } });

    // The corrective fetch goes through the same binding-change debounce as any other param
    // change, so this settles a little after the first (stale) resolve rather than immediately.
    await vi.waitFor(
      () => {
        expect(calls.at(-1)?.params.region).toBe('eu');
      },
      { timeout: 1000 },
    );
  });

  it('resolves a forward-referenced default when the table arrives before the form via updateAst', async () => {
    const calls: DataRequest[] = [];
    const resolver = vi.fn(async (req: DataRequest): Promise<DataResult> => {
      calls.push(req);
      return { rows: [{ id: 1 }], total: 1 };
    });

    const tableOnly = makeAst([
      {
        id: 'accounts',
        type: 'table',
        sensitive: false,
        disabled: false,
        visible: true,
        columns: [{ key: 'id', header: 'ID' }],
        data: { source: 'accounts', params: { region: '{{filters.region}}' } },
      },
    ]);
    const withForm = makeAst([
      tableOnly.children[0]!.component as never,
      {
        id: 'filters',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        onSubmit: 'apply',
        fields: [{ name: 'region', type: 'select', label: 'Region', defaultValue: 'eu' }],
      },
    ]);

    const store = createDocumentStore(tableOnly, { dataSources: { accounts: resolver } });
    store.updateAst(withForm);

    await vi.waitFor(() => {
      expect(calls.at(-1)?.params.region).toBe('eu');
    });
  });

  it('refetches from the real source when a streamed re-parse changes the ref on an existing component', async () => {
    const calls: DataRequest[] = [];
    const resolver = vi.fn(async (req: DataRequest): Promise<DataResult> => {
      calls.push(req);
      return { rows: [{ id: 1, source: req.source }], total: 1 };
    });

    const truncated = makeAst([
      {
        id: 'accounts',
        type: 'table',
        sensitive: false,
        disabled: false,
        visible: true,
        columns: [{ key: 'id', header: 'ID' }],
        data: { source: 'ord' },
      },
    ]);
    const complete = makeAst([
      {
        id: 'accounts',
        type: 'table',
        sensitive: false,
        disabled: false,
        visible: true,
        columns: [{ key: 'id', header: 'ID' }],
        data: { source: 'orders', params: { status: 'open' } },
      },
    ]);

    const store = createDocumentStore(truncated, {
      dataSources: { orders: resolver },
    });

    await vi.waitFor(() => {
      expect(store.getDataState('accounts')?.status).toBe('error');
    });
    expect(store.getDataState('accounts')?.error).toMatch(/unknown data source "ord"/i);

    store.updateAst(complete);

    await vi.waitFor(() => {
      expect(store.getDataState('accounts')?.status).toBe('ready');
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].source).toBe('orders');
    expect(calls[0].params.status).toBe('open');
  });

  it('does not fail an in-flight slot when a sibling slot sharing the request aborts', async () => {
    let resolveShared: ((result: DataResult) => void) | undefined;
    const resolver = vi.fn(
      () =>
        new Promise<DataResult>((resolve) => {
          resolveShared = resolve;
        }),
    );

    const ast = makeAst([
      {
        id: 'a',
        type: 'table',
        sensitive: false,
        disabled: false,
        visible: true,
        columns: [{ key: 'id', header: 'ID' }],
        data: { source: 'shared' },
      },
      {
        id: 'b',
        type: 'table',
        sensitive: false,
        disabled: false,
        visible: true,
        columns: [{ key: 'id', header: 'ID' }],
        data: { source: 'shared' },
      },
    ]);

    const store = createDocumentStore(ast, { dataSources: { shared: resolver } });

    await vi.waitFor(() => {
      expect(store.getDataState('a')?.status).toBe('loading');
      expect(store.getDataState('b')?.status).toBe('loading');
    });

    store.updateAst(makeAst([ast.children[1]!.component as never]));

    resolveShared?.({ rows: [{ id: 1 }], total: 1 });

    await vi.waitFor(() => {
      expect(store.getDataState('b')?.status).toBe('ready');
    });
    expect(store.getDataState('b')?.rows).toEqual([{ id: 1 }]);
  });
});
