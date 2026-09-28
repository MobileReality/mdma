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
});
