import { describe, expect, it, vi } from 'vitest';
import { TableRenderer } from '../src/components/TableRenderer.js';
import { mdma } from './helpers/doc.js';
import { flushMicrotasks } from './helpers/flush.js';
import { mountBlock } from './helpers/mount-block.js';

const TABLE = mdma(`
type: table
id: accounts
pageSize: 1
filterable: true
columns:
  - key: name
    header: "Name"
    sortable: true
  - key: email
    header: "Email"
    sensitive: true
data:
  source: accounts
`);

const MASK = '•••••';

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

async function mountTable() {
  const mounted = await mountBlock(TABLE, TableRenderer, {
    storeDataSources: { accounts: resolver },
  });
  await flushMicrotasks();
  return mounted;
}

describe('TableRenderer revealed cells on a data source', () => {
  it('masks a revealed cell again after a page change', async () => {
    const { wrapper, store } = await mountTable();

    await wrapper.find('.mdma-table-cell--sensitive').trigger('click');
    expect(wrapper.find('.mdma-table-cell--sensitive').text()).toBe('a@acme.test');

    store.setDataPage('accounts', 2);
    await flushMicrotasks();

    expect(wrapper.text()).toContain('Globex');
    expect(wrapper.find('.mdma-table-cell--sensitive').text()).toBe(MASK);
  });

  it('masks a revealed cell again after a sort change', async () => {
    const { wrapper, store } = await mountTable();

    await wrapper.find('.mdma-table-cell--sensitive').trigger('click');
    expect(wrapper.find('.mdma-table-cell--sensitive').text()).toBe('a@acme.test');

    store.setDataSort('accounts', { key: 'name', direction: 'desc' });
    await flushMicrotasks();

    expect(wrapper.text()).toContain('Globex');
    expect(wrapper.find('.mdma-table-cell--sensitive').text()).toBe(MASK);
  });
});

describe('TableRenderer filter on a data source', () => {
  it('calls setDataFilter when typing and shows the filtered rows', async () => {
    const { wrapper, store } = await mountTable();
    const spy = vi.spyOn(store, 'setDataFilter');

    const input = wrapper.find('.mdma-table-filter input');
    expect(input.exists()).toBe(true);
    await input.setValue('glob');
    await flushMicrotasks();

    expect(spy).toHaveBeenCalledWith('accounts', 'glob');
    expect(wrapper.text()).toContain('Globex');
    expect(wrapper.text()).not.toContain('Acme');
  });

  it('keeps the input when the filter matches nothing', async () => {
    const { wrapper } = await mountTable();
    const input = wrapper.find('.mdma-table-filter input').element;

    await wrapper.find('.mdma-table-filter input').setValue('nothing');
    await flushMicrotasks();

    expect(wrapper.find('.mdma-table-filter input').element).toBe(input);
  });
});
