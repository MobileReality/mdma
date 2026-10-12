import { afterEach, describe, expect, it, vi } from 'vitest';

// biome-ignore lint/suspicious/noExplicitAny: react's act() global switch has no typed home
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { TableRenderer } from '../src/components/TableRenderer.js';
import { MdmaProvider } from '../src/context/MdmaProvider.js';
import { flushMicrotasks } from './helpers/flush.js';

const MASK = '•••••';

const component = {
  id: 'accounts',
  type: 'table',
  sensitive: false,
  disabled: false,
  visible: true,
  pageSize: 1,
  filterable: true,
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sensitive: true },
  ],
  data: { source: 'accounts' },
};

const resolver = vi.fn(
  async (req: { page?: number; filter?: string; sort?: { direction: string } }) => {
    const all = [
      { name: 'Acme', email: 'a@acme.test' },
      { name: 'Globex', email: 'g@globex.test' },
    ];
    const matching = req.filter
      ? all.filter((row) => row.name.toLowerCase().includes(req.filter?.toLowerCase() ?? ''))
      : all;
    const ordered = req.sort?.direction === 'desc' ? [...matching].reverse() : matching;
    const page = req.page ?? 1;
    return { rows: ordered.slice(page - 1, page), total: ordered.length };
  },
);

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

async function mountTable() {
  const ast = {
    type: 'root',
    children: [{ type: 'mdmaBlock', rawYaml: '', component }],
  } as unknown as MdmaRoot;
  const store = createDocumentStore(ast, { dataSources: { accounts: resolver } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <MdmaProvider store={store}>
        <TableRenderer
          component={component as never}
          componentState={store.getComponentState('accounts')}
          dispatch={(action) => store.dispatch(action)}
          resolveBinding={(expr) => store.resolveBinding(expr)}
        />
      </MdmaProvider>,
    );
    await flushMicrotasks();
  });
  return store;
}

const sensitiveCell = () => container!.querySelector('.mdma-table-cell--sensitive') as HTMLElement;

describe('TableRenderer revealed cells on a data source', () => {
  it('masks a revealed cell again after a page change', async () => {
    const store = await mountTable();

    act(() => sensitiveCell().click());
    expect(sensitiveCell().textContent).toBe('a@acme.test');

    await act(async () => {
      store.setDataPage('accounts', 2);
      await flushMicrotasks();
    });

    expect(container!.textContent).toContain('Globex');
    expect(sensitiveCell().textContent).toBe(MASK);
  });

  it('masks a revealed cell again after a sort change', async () => {
    const store = await mountTable();

    act(() => sensitiveCell().click());
    expect(sensitiveCell().textContent).toBe('a@acme.test');

    await act(async () => {
      store.setDataSort('accounts', { key: 'name', direction: 'desc' });
      await flushMicrotasks();
    });

    expect(container!.textContent).toContain('Globex');
    expect(sensitiveCell().textContent).toBe(MASK);
  });
});

describe('TableRenderer filter on a data source', () => {
  it('calls setDataFilter when typing and shows the filtered rows', async () => {
    const store = await mountTable();
    const spy = vi.spyOn(store, 'setDataFilter');

    const input = container!.querySelector('.mdma-table-filter input') as HTMLInputElement;
    expect(input).not.toBeNull();

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, 'glob');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 250));
      await flushMicrotasks();
    });

    expect(spy).toHaveBeenCalledWith('accounts', 'glob');
    expect(container!.textContent).toContain('Globex');
    expect(container!.textContent).not.toContain('Acme');
  });

  it('keeps the same input element when the filter matches nothing', async () => {
    await mountTable();
    const input = container!.querySelector('.mdma-table-filter input') as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, 'nothing');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await flushMicrotasks();
    });

    expect(container!.querySelector('.mdma-table-filter input')).toBe(input);
  });
});
