import { describe, it, expect, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { TableRenderer } from '../src/components/TableRenderer.js';
import { mdma } from './helpers/doc.js';
import { mountBlock } from './helpers/mount-block.js';

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

    const { wrapper } = await mountBlock(TABLE, TableRenderer, {
      storeDataSources: { accounts: resolver },
    });

    expect(wrapper.text()).toContain('Loading');

    resolveFetch?.([
      { id: 1, name: 'Acme' },
      { id: 2, name: 'Globex' },
    ]);
    await flushPromises();
    await flushPromises();

    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.text()).toContain('Globex');
    expect(wrapper.text()).not.toContain('Loading');
  });
});
