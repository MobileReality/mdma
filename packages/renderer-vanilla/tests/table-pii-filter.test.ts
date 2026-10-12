import { describe, expect, it, vi } from 'vitest';
import { TableRenderer } from '../src/components/TableRenderer.js';
import { mdma } from './helpers/doc.js';
import { mountBlockFor } from './helpers/mount.js';

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
const tick = () => new Promise((r) => setTimeout(r, 0));

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

const sensitiveCell = (root: HTMLElement) =>
  root.querySelector('.mdma-table-cell--sensitive') as HTMLElement;

async function mountTable() {
  const mounted = await mountBlockFor(TABLE, TableRenderer, {}, { accounts: resolver });
  await tick();
  mounted.refresh();
  return mounted;
}

describe('TableRenderer revealed cells on a data source', () => {
  it('keeps a revealed cell across store notifies, then masks it after a page change', async () => {
    const { instance, store, refresh } = await mountTable();

    sensitiveCell(instance.el).click();
    expect(sensitiveCell(instance.el).textContent).toBe('a@acme.test');

    refresh();
    expect(sensitiveCell(instance.el).textContent).toBe('a@acme.test');

    store.setDataPage('accounts', 2);
    await tick();
    refresh();

    expect(instance.el.textContent).toContain('Globex');
    expect(sensitiveCell(instance.el).textContent).toBe(MASK);
  });

  it('masks the cell again after a sort change', async () => {
    const { instance, store, refresh } = await mountTable();
    sensitiveCell(instance.el).click();

    store.setDataSort('accounts', { key: 'name', direction: 'desc' });
    await tick();
    refresh();

    expect(instance.el.textContent).toContain('Globex');
    expect(sensitiveCell(instance.el).textContent).toBe(MASK);
  });
});

describe('TableRenderer filter on a data source', () => {
  it('renders a filter input that calls setDataFilter and shows the filtered rows', async () => {
    const { instance, store, refresh } = await mountTable();
    const spy = vi.spyOn(store, 'setDataFilter');

    const input = instance.el.querySelector('.mdma-table-filter input') as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = 'glob';
    input.dispatchEvent(new Event('input'));
    await tick();
    refresh();

    expect(spy).toHaveBeenCalledWith('accounts', 'glob');
    expect(instance.el.textContent).toContain('Globex');
    expect(instance.el.textContent).not.toContain('Acme');
    expect(instance.el.querySelector('.mdma-table-filter input')).toBe(input);
  });

  it('keeps the input when the filter matches nothing', async () => {
    const { instance, refresh } = await mountTable();
    const input = instance.el.querySelector('.mdma-table-filter input') as HTMLInputElement;

    input.value = 'nothing';
    input.dispatchEvent(new Event('input'));
    await tick();
    refresh();

    expect(instance.el.querySelector('.mdma-table-filter input')).toBe(input);
  });
});
