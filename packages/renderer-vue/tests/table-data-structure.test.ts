import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { TableRenderer } from '../src/components/TableRenderer.js';
import { mdma } from './helpers/doc.js';
import { flushMicrotasks } from './helpers/flush.js';
import { mountBlock } from './helpers/mount-block.js';

const SORTABLE_TABLE = mdma(`
type: table
id: accounts
pageSize: 20
columns:
  - key: id
    header: "ID"
  - key: name
    header: "Name"
    sortable: true
data:
  source: accounts
`);

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
  const mounted = await mountBlock(SORTABLE_TABLE, TableRenderer, {
    storeDataSources: { accounts: resolver },
  });
  await flushPromises();
  return { ...mounted, release: () => releasePage2?.() };
}

describe('TableRenderer data table structure', () => {
  it('renders pagination inside the table card', async () => {
    const { wrapper } = await mountPaged();

    const table = wrapper.find('.mdma-table');
    expect(table.find('.mdma-table-pagination').exists()).toBe(true);
    expect(table.find('.mdma-table-pagination-status').text()).toBe('Page 1 / 2');
    expect(wrapper.findAll('.mdma-table-pagination')).toHaveLength(1);
  });

  it('sets aria-busy on the card while a page loads and clears it after', async () => {
    const { wrapper, store, release } = await mountPaged();
    expect(wrapper.find('.mdma-table').attributes('aria-busy')).toBeUndefined();

    store.setDataPage('accounts', 2);
    await flushPromises();

    const table = wrapper.find('.mdma-table');
    expect(table.attributes('aria-busy')).toBe('true');

    release();
    await flushMicrotasks();
    expect(wrapper.find('.mdma-table').attributes('aria-busy')).toBeUndefined();
  });

  it('sets aria-sort and a sort indicator only on the sorted header', async () => {
    const { wrapper, store } = await mountPaged();
    expect(wrapper.find('.mdma-table-sort-indicator').exists()).toBe(false);

    store.setDataSort('accounts', { key: 'name', direction: 'asc' });
    await flushMicrotasks();

    let headers = wrapper.findAll('th');
    expect(headers[0].attributes('aria-sort')).toBeUndefined();
    expect(headers[1].attributes('aria-sort')).toBe('ascending');
    expect(headers[1].find('.mdma-table-sort-indicator').text()).toBe('↑');
    expect(headers[0].find('.mdma-table-sort-indicator').exists()).toBe(false);

    store.setDataSort('accounts', { key: 'name', direction: 'desc' });
    await flushMicrotasks();
    headers = wrapper.findAll('th');
    expect(headers[1].attributes('aria-sort')).toBe('descending');
    expect(headers[1].find('.mdma-table-sort-indicator').text()).toBe('↓');
  });
});
