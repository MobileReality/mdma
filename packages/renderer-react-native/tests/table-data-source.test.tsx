import { describe, it, expect, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, create } from 'react-test-renderer';

// biome-ignore lint/suspicious/noExplicitAny: react's act() global switch has no typed home
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-native', () => {
  const passthrough =
    (name: string) =>
    ({ children, ...rest }: { children?: ReactNode }) =>
      createElement(name, rest, children);
  return {
    View: passthrough('rn-view'),
    Text: passthrough('rn-text'),
    ScrollView: passthrough('rn-scrollview'),
    Pressable: passthrough('rn-pressable'),
    Switch: passthrough('rn-switch'),
    TextInput: passthrough('rn-textinput'),
    useColorScheme: () => 'light',
  };
});

const { createDocumentStore } = await import('@mobile-reality/mdma-runtime');
const { MdmaProvider } = await import('../src/context/MdmaProvider.js');
const { MdmaThemeProvider } = await import('../src/theme/MdmaThemeProvider.js');
const { TableRenderer } = await import('../src/components/TableRenderer.js');
type MdmaRoot = import('@mobile-reality/mdma-spec').MdmaRoot;

function makeAst(component: Record<string, unknown>): MdmaRoot {
  return {
    type: 'root',
    children: [{ type: 'mdmaBlock', rawYaml: '', component }],
  } as unknown as MdmaRoot;
}

function collectText(node: unknown, out: string[]): void {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return;
  }
  const el = node as { children?: unknown };
  if (el.children) collectText(el.children, out);
}

function textOf(root: ReturnType<typeof create>): string {
  const out: string[] = [];
  collectText(root.toJSON(), out);
  return out.join(' ');
}

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

    let root: ReturnType<typeof create> | undefined;
    act(() => {
      root = create(
        <MdmaProvider store={store}>
          <MdmaThemeProvider>
            <TableRenderer
              component={component as never}
              componentState={store.getComponentState('accounts')}
              dispatch={(action) => store.dispatch(action)}
              resolveBinding={(expr) => store.resolveBinding(expr)}
            />
          </MdmaThemeProvider>
        </MdmaProvider>,
      );
    });

    expect(textOf(root!)).toContain('Loading');

    await act(async () => {
      resolveFetch?.([
        { id: 1, name: 'Acme' },
        { id: 2, name: 'Globex' },
      ]);
      await Promise.resolve();
      await Promise.resolve();
    });

    const text = textOf(root!);
    expect(text).toContain('Acme');
    expect(text).toContain('Globex');
    expect(text).not.toContain('Loading');
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

    const component = {
      id: 'accounts',
      type: 'table',
      sensitive: false,
      disabled: false,
      visible: true,
      pageSize: 20,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
      ],
      data: { source: 'accounts' },
    };
    const store = createDocumentStore(makeAst(component), {
      dataSources: { accounts: resolver },
    });

    let root: ReturnType<typeof create> | undefined;
    act(() => {
      root = create(
        <MdmaProvider store={store}>
          <MdmaThemeProvider>
            <TableRenderer
              component={component as never}
              componentState={store.getComponentState('accounts')}
              dispatch={(action) => store.dispatch(action)}
              resolveBinding={(expr) => store.resolveBinding(expr)}
            />
          </MdmaThemeProvider>
        </MdmaProvider>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(textOf(root!)).toContain('Acme');

    act(() => store.setDataPage('accounts', 2));

    expect(textOf(root!)).toContain('Acme');
    expect(textOf(root!)).toContain('Loading');

    await act(async () => {
      releasePage2?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(textOf(root!)).toContain('Page Two');
    expect(textOf(root!)).not.toContain('Loading');
  });
});
