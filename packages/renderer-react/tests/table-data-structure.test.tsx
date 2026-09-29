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

function makeAst(component: Record<string, unknown>): MdmaRoot {
  return {
    type: 'root',
    children: [{ type: 'mdmaBlock', rawYaml: '', component }],
  } as unknown as MdmaRoot;
}

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

function dom(): HTMLDivElement {
  if (!container) throw new Error('not mounted');
  return container;
}

async function mountPaged() {
  let releasePage2: (() => void) | undefined;
  const resolver = vi.fn(async (req: { page?: number }) => {
    if (req.page === 2) {
      await new Promise<void>((resolve) => {
        releasePage2 = resolve;
      });
      return { rows: [{ id: 21, name: 'Page Two' }], total: 40 };
    }
    return { rows: [{ id: 1, name: 'Acme' }], total: 40 };
  });
  const component = {
    id: 'accounts',
    type: 'table',
    sensitive: false,
    disabled: false,
    visible: true,
    pageSize: 20,
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name', sortable: true },
    ],
    data: { source: 'accounts' },
  };
  const store = createDocumentStore(makeAst(component), {
    dataSources: { accounts: resolver },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
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
  return { store, release: () => releasePage2?.() };
}

describe('TableRenderer data table structure', () => {
  it('renders pagination inside the table card', async () => {
    await mountPaged();

    const table = dom().querySelector('.mdma-table');
    expect(table?.querySelector('.mdma-table-pagination')).not.toBeNull();
    expect(table?.querySelector('.mdma-table-pagination-status')?.textContent).toBe('Page 1 / 2');
    expect(dom().querySelectorAll('.mdma-table-pagination')).toHaveLength(1);
  });

  it('sets aria-busy on the card while a page loads and clears it after', async () => {
    const { store, release } = await mountPaged();
    expect(dom().querySelector('.mdma-table')?.hasAttribute('aria-busy')).toBe(false);

    act(() => store.setDataPage('accounts', 2));

    const table = dom().querySelector('.mdma-table');
    expect(table?.getAttribute('aria-busy')).toBe('true');

    await act(async () => {
      release();
      await flushMicrotasks();
    });
    expect(dom().querySelector('.mdma-table')?.hasAttribute('aria-busy')).toBe(false);
  });

  it('sets aria-sort and a sort indicator only on the sorted header', async () => {
    const { store } = await mountPaged();
    const headers = () => dom().querySelectorAll('th');
    expect(dom().querySelector('.mdma-table-sort-indicator')).toBeNull();

    await act(async () => {
      store.setDataSort('accounts', { key: 'name', direction: 'asc' });
      await flushMicrotasks();
    });

    expect(headers()[0].hasAttribute('aria-sort')).toBe(false);
    expect(headers()[1].getAttribute('aria-sort')).toBe('ascending');
    expect(headers()[1].querySelector('.mdma-table-sort-indicator')?.textContent).toBe('↑');
    expect(headers()[0].querySelector('.mdma-table-sort-indicator')).toBeNull();

    await act(async () => {
      store.setDataSort('accounts', { key: 'name', direction: 'desc' });
      await flushMicrotasks();
    });
    expect(headers()[1].getAttribute('aria-sort')).toBe('descending');
    expect(headers()[1].querySelector('.mdma-table-sort-indicator')?.textContent).toBe('↓');
  });
});
