import { describe, it, expect, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TableRenderer } from '../src/components/TableRenderer.js';
import { flushMicrotasks } from './helpers/flush.js';
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

    const { wrapper } = await mountBlock(TABLE, TableRenderer, {
      storeDataSources: { accounts: resolver },
    });

    expect(wrapper.text()).toContain('Loading');

    resolveFetch?.([
      { id: 1, name: 'Acme' },
      { id: 2, name: 'Globex' },
    ]);
    await flushMicrotasks();

    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.text()).toContain('Globex');
    expect(wrapper.text()).not.toContain('Loading');
  });

  it('routes the reload indicator through the dataLoading override with reloading set', async () => {
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
    const CustomLoading = defineComponent({
      props: { componentId: String, reloading: Boolean },
      setup: (props) => () =>
        h('i', { class: 'custom-loading' }, props.reloading ? 'reload' : 'first'),
    });

    const { wrapper, store } = await mountBlock(PAGED_TABLE, TableRenderer, {
      storeDataSources: { accounts: resolver },
      elementOverrides: { table: { dataLoading: CustomLoading } },
    });
    await flushPromises();
    expect(wrapper.find('.custom-loading').exists()).toBe(false);

    store.setDataPage('accounts', 2);
    await flushPromises();

    expect(wrapper.find('.custom-loading').text()).toBe('reload');
    releasePage2?.();
    await flushPromises();
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

    const { wrapper, store } = await mountBlock(PAGED_TABLE, TableRenderer, {
      storeDataSources: { accounts: resolver },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Acme');

    store.setDataPage('accounts', 2);
    await flushPromises();

    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.text()).toContain('Loading');

    releasePage2?.();
    await flushMicrotasks();

    expect(wrapper.text()).toContain('Page Two');
    expect(wrapper.text()).not.toContain('Loading');
  });
});
