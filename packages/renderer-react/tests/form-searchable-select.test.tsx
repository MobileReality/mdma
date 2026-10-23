import { afterEach, describe, expect, it, vi } from 'vitest';

// biome-ignore lint/suspicious/noExplicitAny: react's act() global switch has no typed home
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
import {
  type DataRequest,
  type DataResult,
  type DataSourceMap,
  type DocumentStore,
  createDocumentStore,
} from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { FormRenderer } from '../src/components/FormRenderer.js';
import {
  ElementOverridesProvider,
  type FormComboboxElementProps,
} from '../src/context/ElementOverridesContext.js';
import { MdmaProvider } from '../src/context/MdmaProvider.js';
import { useComponentState } from '../src/hooks/use-document-store.js';
import { flushMicrotasks } from './helpers/flush.js';

const PRODUCTS = [
  { label: 'Oat flakes', value: 'oat' },
  { label: 'Skyr natural', value: 'skyr' },
  { label: 'Chicken breast', value: 'chicken' },
];

function formWith(options: unknown) {
  return {
    id: 'meal',
    type: 'form',
    sensitive: false,
    disabled: false,
    visible: true,
    onSubmit: 'log-meal',
    fields: [{ name: 'product', type: 'select', label: 'Product', searchable: true, options }],
  };
}

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

async function renderForm(
  options: unknown,
  dataSources?: DataSourceMap,
  overrides?: Record<string, Record<string, React.ComponentType<never>>>,
  existingStore?: DocumentStore,
): Promise<DocumentStore> {
  const component = formWith(options);
  const ast = {
    type: 'root',
    children: [{ type: 'mdmaBlock', rawYaml: '', component }],
  } as unknown as MdmaRoot;
  const store = existingStore ?? createDocumentStore(ast, { dataSources });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const Form = () => (
    <FormRenderer
      component={component as never}
      componentState={useComponentState('meal')}
      dispatch={(action) => store.dispatch(action)}
      resolveBinding={(expr) => store.resolveBinding(expr)}
    />
  );
  await act(async () => {
    root!.render(
      <MdmaProvider store={store}>
        <ElementOverridesProvider value={overrides}>
          <Form />
        </ElementOverridesProvider>
      </MdmaProvider>,
    );
    await Promise.resolve();
  });
  return store;
}

function input(): HTMLInputElement {
  return container!.querySelector('#meal-product') as HTMLInputElement;
}

function optionLabels(): string[] {
  return Array.from(container!.querySelectorAll('[role="option"]')).map((o) => o.textContent ?? '');
}

async function type(text: string) {
  await act(async () => {
    input().focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input(), text);
    input().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

// past the runtime's 150 ms filter debounce, then let the resolver settle
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await flushMicrotasks();
  });
}

async function key(name: string) {
  await act(async () => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
  });
}

describe('FormRenderer searchable select', () => {
  it('renders a combobox instead of a native select', async () => {
    await renderForm(PRODUCTS);
    expect(input().getAttribute('role')).toBe('combobox');
    expect(container!.querySelector('select')).toBeNull();
  });

  it('filters inline options by the typed text', async () => {
    await renderForm(PRODUCTS);
    await type('sky');
    expect(optionLabels()).toEqual(['Skyr natural']);
  });

  it('selects with the keyboard and shows the chosen label', async () => {
    const store = await renderForm(PRODUCTS);
    await type('chick');
    await key('ArrowDown');
    expect(input().getAttribute('aria-activedescendant')).toBe('meal-product-option-0');
    await key('Enter');
    expect(store.getComponentState('meal')?.values.product).toBe('chicken');
    await act(async () => input().blur());
    expect(input().value).toBe('Chicken breast');
  });

  it('sends the typed text to the data source as filter', async () => {
    const resolve = vi.fn(
      async (req: DataRequest): Promise<DataResult> => ({
        rows: PRODUCTS.filter((p) =>
          p.label.toLowerCase().includes((req.filter ?? '').toLowerCase()),
        ),
      }),
    );
    await renderForm({ source: 'products' }, { products: resolve });
    await type('oat');
    await settle();
    expect(optionLabels()).toEqual(['Oat flakes']);
    expect(resolve).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: 'products', filter: 'oat' }),
      expect.anything(),
    );
  });

  it('keeps the chosen label after a later search drops the option', async () => {
    const resolve = async (req: DataRequest): Promise<DataResult> => ({
      rows: PRODUCTS.filter((p) =>
        p.label.toLowerCase().includes((req.filter ?? '').toLowerCase()),
      ),
    });
    const store = await renderForm({ source: 'products' }, { products: resolve });
    await type('skyr');
    await settle();
    expect(optionLabels()).toEqual(['Skyr natural']);
    await key('ArrowDown');
    await key('Enter');
    await type('chicken');
    await settle();
    expect(optionLabels()).toEqual(['Chicken breast']);
    await act(async () => input().blur());
    expect(store.getComponentState('meal')?.values.product).toBe('skyr');
    expect(input().value).toBe('Skyr natural');
  });

  it('shows the data source error with a retry', async () => {
    const resolve = async (): Promise<DataResult> => {
      throw new Error('search down');
    };
    await renderForm({ source: 'products' }, { products: resolve });
    await type('a');
    await settle();
    const status = container!.querySelector('.mdma-combobox-status--error');
    expect(status?.textContent).toContain('search down');
    expect(status?.querySelector('button')?.textContent).toBe('Retry');
  });

  it('announces status outside the listbox and retries on Enter', async () => {
    let calls = 0;
    const resolve = async (): Promise<DataResult> => {
      calls++;
      throw new Error('search down');
    };
    await renderForm({ source: 'products' }, { products: resolve });
    await type('a');
    await settle();
    const status = container!.querySelector('output.mdma-combobox-status');
    expect(status?.closest('[role="listbox"]')).toBeNull();
    expect(container!.querySelector('[role="listbox"]')?.hasAttribute('hidden')).toBe(true);
    expect(input().getAttribute('aria-controls')).toBe('meal-product-listbox');
    const before = calls;
    await key('Enter');
    await settle();
    expect(calls).toBe(before + 1);
  });

  it('drops the highlight when the results change', async () => {
    const resolve = async (req: DataRequest): Promise<DataResult> => ({
      rows: PRODUCTS.filter((p) =>
        p.label.toLowerCase().includes((req.filter ?? '').toLowerCase()),
      ),
    });
    await renderForm({ source: 'products' }, { products: resolve });
    await settle();
    // highlight a stale row while the debounced search is still pending
    await type('chicken');
    await key('ArrowDown');
    expect(input().getAttribute('aria-activedescendant')).toBe('meal-product-option-0');
    await settle();
    expect(optionLabels()).toEqual(['Chicken breast']);
    expect(input().getAttribute('aria-activedescendant')).toBeNull();
  });

  it('clears a filter left on the slot when the field mounts again', async () => {
    const resolve = async (req: DataRequest): Promise<DataResult> => ({
      rows: PRODUCTS.filter((p) =>
        p.label.toLowerCase().includes((req.filter ?? '').toLowerCase()),
      ),
    });
    const store = await renderForm({ source: 'products' }, { products: resolve });
    await type('sky');
    await settle();
    expect(store.getDataState('meal.product')?.filter).toBe('sky');
    act(() => root?.unmount());
    container?.remove();

    await renderForm({ source: 'products' }, undefined, undefined, store);
    await settle();
    expect(store.getDataState('meal.product')?.filter).toBeUndefined();
    expect(store.getDataState('meal.product')?.rows).toEqual(PRODUCTS);
  });

  it('uses the form.combobox override', async () => {
    const Custom = ({ id, options }: FormComboboxElementProps) => (
      <div id={id} data-count={options.length} />
    );
    await renderForm(PRODUCTS, undefined, { form: { combobox: Custom as never } });
    expect(input().getAttribute('data-count')).toBe('3');
  });
});
