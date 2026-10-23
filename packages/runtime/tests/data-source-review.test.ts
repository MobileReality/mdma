import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import { describe, expect, it, vi } from 'vitest';
import type { DataRequest, DataResult } from '../src/core/data-source-manager.js';
import { createDocumentStore } from '../src/core/document-store.js';

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

function formComp(id: string, fields: Array<Record<string, unknown>>) {
  return {
    id,
    type: 'form',
    sensitive: false,
    disabled: false,
    visible: true,
    onSubmit: 'submit',
    fields,
  };
}

function tableComp(id: string, data: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    id,
    type: 'table',
    sensitive: false,
    disabled: false,
    visible: true,
    columns: [{ key: 'id', header: 'ID' }],
    data,
    ...extra,
  };
}

function searchAst() {
  return makeAst([
    formComp('f', [{ name: 'q', type: 'text', label: 'Q', defaultValue: 'a' }]),
    tableComp('t', { source: 'rows', params: { q: '{{f.q}}' } }),
  ]);
}

describe('server-paged results without total', () => {
  it('shows the resolver page as-is on page 2', async () => {
    const resolver = vi.fn(async (req: DataRequest): Promise<DataResult> => {
      const page = req.page ?? 1;
      return { rows: [{ id: `p${page}-a` }, { id: `p${page}-b` }] };
    });
    const store = createDocumentStore(
      makeAst([tableComp('t', { source: 'rows' }, { pageSize: 2 })]),
      { dataSources: { rows: resolver } },
    );
    await vi.waitFor(() => expect(store.getDataState('t')?.status).toBe('ready'));

    store.setDataPage('t', 2);

    await vi.waitFor(() =>
      expect(store.getDataState('t')?.rows).toEqual([{ id: 'p2-a' }, { id: 'p2-b' }]),
    );
    expect(store.getDataState('t')?.total).toBeUndefined();
  });
});

describe('form option slot cleanup', () => {
  it('unregisters the slot of a field renamed while streaming', () => {
    const field = (name: string) => ({
      name,
      type: 'select',
      label: 'City',
      options: { source: 'cities' },
    });
    const store = createDocumentStore(makeAst([formComp('form', [field('cit')])]), {
      dataSources: { cities: [{ label: 'A', value: 'a' }] },
    });
    expect(store.getDataState('form.cit')).toBeDefined();

    store.updateAst(makeAst([formComp('form', [field('city')])]));

    expect(store.getDataState('form.cit')).toBeUndefined();
    expect(store.getDataState('form.city')).toBeDefined();
  });

  it('unregisters option slots when a form is retyped', () => {
    const field = { name: 'city', type: 'select', label: 'City', options: { source: 'cities' } };
    const store = createDocumentStore(makeAst([formComp('x', [field])]), {
      dataSources: { cities: [{ label: 'A', value: 'a' }], rows: [{ id: 1 }] },
    });
    expect(store.getDataState('x.city')).toBeDefined();

    store.updateAst(makeAst([tableComp('x', { source: 'rows' })]));

    expect(store.getDataState('x.city')).toBeUndefined();
    expect(store.getDataState('x')).toBeDefined();
  });
});

describe('DocumentStore.dispose', () => {
  it('cancels timers and in-flight requests and stops notifying and logging', async () => {
    vi.useFakeTimers();
    try {
      const signals: AbortSignal[] = [];
      const resolver = vi.fn(
        (_req: DataRequest, ctx: { signal: AbortSignal }) =>
          new Promise<DataResult>(() => {
            signals.push(ctx.signal);
          }),
      );
      const ast = searchAst();
      const store = createDocumentStore(ast, { dataSources: { rows: resolver } });
      const listener = vi.fn();
      store.subscribe(listener);
      store.dispatch({ type: 'FIELD_CHANGED', componentId: 'f', field: 'q', value: 'ab' });
      listener.mockClear();
      const logged = store.getEventLog().size();

      store.dispose();
      await vi.advanceTimersByTimeAsync(1000);

      expect(signals[0]?.aborted).toBe(true);
      expect(resolver).toHaveBeenCalledTimes(1);
      expect(store.getDataState('t')).toBeUndefined();
      expect(listener).not.toHaveBeenCalled();
      expect(store.getEventLog().size()).toBe(logged);

      store.updateAst(ast);
      await vi.advanceTimersByTimeAsync(1000);
      expect(resolver).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('streamed ref changes', () => {
  it('debounces so partial source names never reach the resolver', async () => {
    vi.useFakeTimers();
    try {
      const resolver = vi.fn(
        async (req: DataRequest): Promise<DataResult> => ({ rows: [{ id: req.source }], total: 1 }),
      );
      const table = (source: string) => makeAst([tableComp('t', { source })]);
      const store = createDocumentStore(table('orders'), { dataSources: { orders: resolver } });
      await vi.advanceTimersByTimeAsync(0);
      expect(store.getDataState('t')?.status).toBe('ready');
      resolver.mockClear();

      store.updateAst(table('ord'));
      store.updateAst(table('orde'));
      expect(store.getDataState('t')?.status).toBe('ready');
      store.updateAst(table('orders'));
      await vi.advanceTimersByTimeAsync(1000);

      expect(store.getDataState('t')?.status).toBe('ready');
      expect(resolver).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('still fetches a brand-new slot immediately', () => {
    vi.useFakeTimers();
    try {
      const resolver = vi.fn(async (): Promise<DataResult> => ({ rows: [], total: 0 }));
      const store = createDocumentStore(makeAst([]), { dataSources: { rows: resolver } });
      store.updateAst(makeAst([tableComp('t', { source: 'rows' })]));
      expect(resolver).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('debounce window', () => {
  it('never lands an old-params result as ready, even when the resolver ignores the signal', async () => {
    vi.useFakeTimers();
    try {
      const pending: Array<(r: DataResult) => void> = [];
      const resolver = vi.fn(
        () =>
          new Promise<DataResult>((resolve) => {
            pending.push(resolve);
          }),
      );
      const store = createDocumentStore(searchAst(), { dataSources: { rows: resolver } });

      store.dispatch({ type: 'FIELD_CHANGED', componentId: 'f', field: 'q', value: 'b' });
      pending[0]?.({ rows: [{ id: 'old' }], total: 1 });
      await vi.advanceTimersByTimeAsync(10);

      expect(store.getDataState('t')?.status).not.toBe('ready');
      expect(store.getDataState('t')?.rows).toEqual([]);

      await vi.advanceTimersByTimeAsync(1000);
      pending[1]?.({ rows: [{ id: 'new' }], total: 1 });
      await vi.advanceTimersByTimeAsync(0);
      expect(store.getDataState('t')?.rows).toEqual([{ id: 'new' }]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('dependent select', () => {
  const citiesByCountry: Record<string, Array<{ label: string; value: string }>> = {
    PL: [{ label: 'Warsaw', value: 'WAW' }],
    DE: [{ label: 'Berlin', value: 'BER' }],
  };

  function intakeAst(cityDefault?: string) {
    return makeAst([
      formComp('intake', [
        { name: 'country', type: 'select', label: 'Country', defaultValue: 'PL' },
        {
          name: 'city',
          type: 'select',
          label: 'City',
          defaultValue: cityDefault,
          options: { source: 'cities', params: { country: '{{intake.country}}' } },
        },
      ]),
    ]);
  }

  const resolver = async (req: DataRequest): Promise<DataResult> => ({
    rows: citiesByCountry[String(req.params.country)] ?? [],
    total: 1,
  });

  it('clears a value the refreshed options no longer contain', async () => {
    const store = createDocumentStore(intakeAst(), { dataSources: { cities: resolver } });
    await vi.waitFor(() => expect(store.getDataState('intake.city')?.status).toBe('ready'));
    store.dispatch({ type: 'FIELD_CHANGED', componentId: 'intake', field: 'city', value: 'WAW' });
    expect(store.getComponentState('intake')?.values.city).toBe('WAW');

    store.dispatch({
      type: 'FIELD_CHANGED',
      componentId: 'intake',
      field: 'country',
      value: 'DE',
    });
    await vi.waitFor(() =>
      expect(store.getDataState('intake.city')?.rows).toEqual(citiesByCountry.DE),
    );

    expect(store.getComponentState('intake')?.values).not.toHaveProperty('city');
    expect(store.resolveBinding('{{intake.city}}')).toBeUndefined();
    expect(store.getBindings()).not.toHaveProperty('city');
  });

  it('keeps a string value when the options carry the same value as a number', async () => {
    const numeric = async (): Promise<DataResult> => ({
      rows: [{ label: 'Warsaw', value: 1 }],
      total: 1,
    });
    const store = createDocumentStore(intakeAst('1'), { dataSources: { cities: numeric } });
    await vi.waitFor(() => expect(store.getDataState('intake.city')?.status).toBe('ready'));
    expect(store.getComponentState('intake')?.values.city).toBe('1');
  });

  it('keeps a value the options still contain', async () => {
    const store = createDocumentStore(intakeAst('WAW'), { dataSources: { cities: resolver } });
    await vi.waitFor(() => expect(store.getDataState('intake.city')?.status).toBe('ready'));
    expect(store.getComponentState('intake')?.values.city).toBe('WAW');
  });
});

describe('searchable select', () => {
  const products = [
    { label: 'Oat flakes', value: 'oat' },
    { label: 'Skyr natural', value: 'skyr' },
    { label: 'Chicken breast', value: 'chicken' },
  ];

  function productAst() {
    return makeAst([
      formComp('meal', [
        {
          name: 'product',
          type: 'select',
          label: 'Product',
          searchable: true,
          options: { source: 'products' },
        },
      ]),
    ]);
  }

  const resolver = vi.fn(
    async (req: DataRequest): Promise<DataResult> => ({
      rows: products.filter((p) =>
        p.label.toLowerCase().includes((req.filter ?? '').toLowerCase()),
      ),
    }),
  );

  it('sends the typed text to the resolver as filter', async () => {
    resolver.mockClear();
    const store = createDocumentStore(productAst(), { dataSources: { products: resolver } });
    await vi.waitFor(() => expect(store.getDataState('meal.product')?.status).toBe('ready'));

    store.setDataFilter('meal.product', 'sky');
    await vi.waitFor(() => expect(store.getDataState('meal.product')?.rows).toEqual([products[1]]));
    expect(resolver).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: 'products', filter: 'sky' }),
      expect.anything(),
    );
  });

  it('keeps the selected value when a new search no longer returns it', async () => {
    const store = createDocumentStore(productAst(), { dataSources: { products: resolver } });
    await vi.waitFor(() => expect(store.getDataState('meal.product')?.status).toBe('ready'));
    store.dispatch({ type: 'FIELD_CHANGED', componentId: 'meal', field: 'product', value: 'oat' });

    store.setDataFilter('meal.product', 'chicken');
    await vi.waitFor(() => expect(store.getDataState('meal.product')?.rows).toEqual([products[2]]));
    expect(store.getComponentState('meal')?.values.product).toBe('oat');
  });

  it('keeps a default value on the first load', async () => {
    const ast = makeAst([
      formComp('meal', [
        {
          name: 'product',
          type: 'select',
          label: 'Product',
          searchable: true,
          defaultValue: 'not-in-first-page',
          options: { source: 'products' },
        },
      ]),
    ]);
    const store = createDocumentStore(ast, { dataSources: { products: resolver } });
    await vi.waitFor(() => expect(store.getDataState('meal.product')?.status).toBe('ready'));
    expect(store.getComponentState('meal')?.values.product).toBe('not-in-first-page');
  });

  it('clears the value when its params change and the new options lack it', async () => {
    const citiesByCountry: Record<string, Array<{ label: string; value: string }>> = {
      PL: [{ label: 'Warsaw', value: 'WAW' }],
      DE: [{ label: 'Berlin', value: 'BER' }],
    };
    const ast = makeAst([
      formComp('intake', [
        { name: 'country', type: 'select', label: 'Country', defaultValue: 'PL' },
        {
          name: 'city',
          type: 'select',
          label: 'City',
          searchable: true,
          options: { source: 'cities', params: { country: '{{intake.country}}' } },
        },
      ]),
    ]);
    const cities = async (req: DataRequest): Promise<DataResult> => ({
      rows: citiesByCountry[String(req.params.country)] ?? [],
    });
    const store = createDocumentStore(ast, { dataSources: { cities } });
    await vi.waitFor(() => expect(store.getDataState('intake.city')?.status).toBe('ready'));
    store.dispatch({ type: 'FIELD_CHANGED', componentId: 'intake', field: 'city', value: 'WAW' });

    store.dispatch({ type: 'FIELD_CHANGED', componentId: 'intake', field: 'country', value: 'DE' });
    await vi.waitFor(() =>
      expect(store.getDataState('intake.city')?.rows).toEqual(citiesByCountry.DE),
    );
    expect(store.getComponentState('intake')?.values).not.toHaveProperty('city');
  });

  it('drops the search filter when the field stops being searchable', async () => {
    const store = createDocumentStore(productAst(), { dataSources: { products: resolver } });
    await vi.waitFor(() => expect(store.getDataState('meal.product')?.status).toBe('ready'));
    store.setDataFilter('meal.product', 'sky');
    await vi.waitFor(() => expect(store.getDataState('meal.product')?.rows).toEqual([products[1]]));

    store.updateAst(
      makeAst([
        formComp('meal', [
          { name: 'product', type: 'select', label: 'Product', options: { source: 'products' } },
        ]),
      ]),
    );
    expect(store.getDataState('meal.product')?.filter).toBeUndefined();
    await vi.waitFor(() => expect(store.getDataState('meal.product')?.rows).toEqual(products));
  });
});
