import { describe, it, expect, afterEach } from 'vitest';

// biome-ignore lint/suspicious/noExplicitAny: react's act() global switch has no typed home
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import * as api from '../src/index.js';
import { MdmaProvider } from '../src/context/MdmaProvider.js';
import { ChartRenderer } from '../src/components/ChartRenderer.js';

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

function mount(node: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(node);
  });
  return container;
}

describe('default data state views', () => {
  it('are exported from the package index', () => {
    expect(typeof api.DefaultDataLoading).toBe('function');
    expect(typeof api.DefaultDataError).toBe('function');
    expect(typeof api.DefaultDataEmpty).toBe('function');
  });

  it('DefaultDataEmpty shows the label when given one', () => {
    const el = mount(<api.DefaultDataEmpty componentId="c" label="Revenue" />);
    expect(el.querySelector('.mdma-chart-label')?.textContent).toBe('Revenue');
    expect(el.textContent).toContain('No data');
  });

  it('DefaultDataEmpty omits the label element without one', () => {
    const el = mount(<api.DefaultDataEmpty componentId="c" />);
    expect(el.querySelector('.mdma-chart-label')).toBeNull();
  });
});

describe('ChartRenderer empty source', () => {
  it('passes chart.label to the dataEmpty override', async () => {
    const component = {
      id: 'sales',
      type: 'chart',
      sensitive: false,
      disabled: false,
      visible: true,
      variant: 'line',
      label: 'Revenue',
      height: 300,
      data: { source: 'empty' },
    };
    const ast = {
      type: 'root',
      children: [{ type: 'mdmaBlock', rawYaml: '', component }],
    } as unknown as MdmaRoot;
    const store = createDocumentStore(ast, {
      dataSources: { empty: async () => ({ rows: [], total: 0 }) },
    });
    const seen: Array<string | undefined> = [];
    const Empty = ({ label }: api.DataEmptyElementProps) => {
      seen.push(label);
      return <div data-testid="empty" />;
    };

    mount(
      <MdmaProvider store={store}>
        <api.ElementOverridesProvider value={{ chart: { dataEmpty: Empty } }}>
          <ChartRenderer
            component={component as never}
            componentState={store.getComponentState('sales')}
            dispatch={(action) => store.dispatch(action)}
            resolveBinding={(expr) => store.resolveBinding(expr)}
          />
        </api.ElementOverridesProvider>
      </MdmaProvider>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(seen).toContain('Revenue');
  });
});
