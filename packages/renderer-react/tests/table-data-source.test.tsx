import { describe, it, expect, vi, afterEach } from 'vitest';

// biome-ignore lint/suspicious/noExplicitAny: react's act() global switch has no typed home
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import { MdmaProvider } from '../src/context/MdmaProvider.js';
import { TableRenderer } from '../src/components/TableRenderer.js';

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

describe('TableRenderer with a data source ref', () => {
  it('shows loading, then renders resolved rows', async () => {
    let resolveFetch: ((rows: Array<Record<string, unknown>>) => void) | undefined;
    const resolver = vi.fn(
      () =>
        new Promise<{ rows: Array<Record<string, unknown>>; total: number }>((resolve) => {
          resolveFetch = (rows) => resolve({ rows, total: rows.length });
        }),
    );

    const component = {
      id: 'accounts',
      type: 'table',
      sensitive: false,
      disabled: false,
      visible: true,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
      ],
      data: { source: 'accounts' },
    };
    const store = createDocumentStore(makeAst(component), {
      dataSources: { accounts: resolver },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
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
    });

    expect(container.textContent).toContain('Loading');

    await act(async () => {
      resolveFetch?.([
        { id: 1, name: 'Acme' },
        { id: 2, name: 'Globex' },
      ]);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Acme');
    expect(container.textContent).toContain('Globex');
    expect(container.textContent).not.toContain('Loading');
  });
});
