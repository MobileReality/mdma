import { describe, expect, it, vi } from 'vitest';
import { TableRenderer } from '../src/components/TableRenderer.js';
import { mdma } from './helpers/doc.js';
import { mountBlockFor } from './helpers/mount.js';

const TABLE = mdma(`
type: table
id: accounts
columns:
  - key: id
    header: "ID"
  - key: name
    header: "Name"
data:
  source: accounts
`);

const PAGED_TABLE = mdma(`
type: table
id: accounts
pageSize: 20
columns:
  - key: id
    header: "ID"
  - key: name
    header: "Name"
data:
  source: accounts
`);

describe('TableRenderer with a data source ref', () => {
  it('shows loading, then renders resolved rows', async () => {
    let resolveFetch: ((rows: Array<Record<string, unknown>>) => void) | undefined;
    const resolver = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = (rows) => resolve({ rows, total: rows.length });
        }),
    );

    const { instance, refresh } = await mountBlockFor(
      TABLE,
      TableRenderer,
      {},
      { accounts: resolver },
    );

    expect(instance.el.textContent).toContain('Loading');

    resolveFetch?.([
      { id: 1, name: 'Acme' },
      { id: 2, name: 'Globex' },
    ]);
    await new Promise((r) => setTimeout(r, 0));
    refresh();

    expect(instance.el.textContent).toContain('Acme');
    expect(instance.el.textContent).toContain('Globex');
    expect(instance.el.textContent).not.toContain('Loading');
  });

  it('keeps the previous rows visible with a loading indicator while a page change loads', async () => {
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

    const { instance, store, refresh } = await mountBlockFor(
      PAGED_TABLE,
      TableRenderer,
      {},
      { accounts: resolver },
    );
    await new Promise((r) => setTimeout(r, 0));
    refresh();
    expect(instance.el.textContent).toContain('Acme');

    store.setDataPage('accounts', 2);
    refresh();

    expect(instance.el.textContent).toContain('Acme');
    expect(instance.el.textContent).toContain('Loading');

    releasePage2?.();
    await new Promise((r) => setTimeout(r, 0));
    refresh();

    expect(instance.el.textContent).toContain('Page Two');
    expect(instance.el.textContent).not.toContain('Loading');
  });
});
