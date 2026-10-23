import type {
  DataRequest,
  DataResult,
  DataSourceMap,
  DocumentStore,
} from '@mobile-reality/mdma-runtime';
import type { MdmaBlock } from '@mobile-reality/mdma-spec';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormRenderer } from '../src/components/FormRenderer.js';
import type { FormComboboxElementProps } from '../src/components/form/element-props.js';
import type { ElementRenderer, RenderContext } from '../src/context/render-context.js';
import { blockRendererProps, mountMdmaBlock } from '../src/document/mount-block.js';
import { el } from '../src/dom/el.js';
import { mdma } from './helpers/doc.js';
import { mountBlockFor } from './helpers/mount.js';

const PRODUCTS = [
  { label: 'Oat flakes', value: 'oat' },
  { label: 'Skyr natural', value: 'skyr' },
  { label: 'Chicken breast', value: 'chicken' },
];

const INLINE_FORM = mdma(`
type: form
id: meal
fields:
  - name: product
    type: select
    label: "Product"
    searchable: true
    options: products
onSubmit: log-meal
`);

const DATA_FORM = mdma(`
type: form
id: meal
fields:
  - name: product
    type: select
    label: "Product"
    searchable: true
    options:
      source: products
onSubmit: log-meal
`);

const filterProducts = async (req: DataRequest): Promise<DataResult> => ({
  rows: PRODUCTS.filter((p) => p.label.toLowerCase().includes((req.filter ?? '').toLowerCase())),
});

let root: HTMLElement | undefined;
let unsubscribe: (() => void) | undefined;

function unmount() {
  unsubscribe?.();
  root?.remove();
  root = undefined;
  unsubscribe = undefined;
}

afterEach(unmount);

/** Mounts the form and re-feeds it on every store notify, as the document does. */
async function renderForm(markdown: string, context: RenderContext, dataSources?: DataSourceMap) {
  const mounted = await mountBlockFor(markdown, FormRenderer, context, dataSources);
  unsubscribe = mounted.store.subscribe(() => mounted.refresh());
  // a resolver may have settled before the subscription existed
  mounted.refresh();
  root = mounted.instance.el;
  return mounted;
}

/** Mounts the same block again over an existing store, as a re-rendered document would. */
function remount(block: MdmaBlock, store: DocumentStore) {
  const instance = mountMdmaBlock({ block, store, renderers: { form: FormRenderer } });
  document.body.appendChild(instance.el);
  unsubscribe = store.subscribe(() => instance.update(blockRendererProps({ block, store })));
  root = instance.el;
}

const renderInline = (context: RenderContext = {}) =>
  renderForm(INLINE_FORM, { dataSources: { products: PRODUCTS }, ...context });

const renderData = (resolve: DataSourceMap[string]) =>
  renderForm(DATA_FORM, {}, { products: resolve });

function input(): HTMLInputElement {
  return root?.querySelector('#meal-product') as HTMLInputElement;
}

function optionLabels(): string[] {
  return Array.from(root?.querySelectorAll('[role="option"]') ?? []).map(
    (o) => o.textContent ?? '',
  );
}

function type(text: string) {
  input().focus();
  input().value = text;
  input().dispatchEvent(new Event('input', { bubbles: true }));
}

function key(name: string) {
  input().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
}

// past the runtime's 150 ms filter debounce, then let the resolver settle
const settle = () => new Promise((resolve) => setTimeout(resolve, 200));

describe('FormRenderer searchable select', () => {
  it('renders a combobox instead of a native select', async () => {
    await renderInline();
    expect(input().getAttribute('role')).toBe('combobox');
    expect(root?.querySelector('select')).toBeNull();
  });

  it('filters inline options by the typed text', async () => {
    await renderInline();
    type('sky');
    expect(optionLabels()).toEqual(['Skyr natural']);
  });

  it('selects with the keyboard and shows the chosen label', async () => {
    const { store } = await renderInline();
    type('chick');
    key('ArrowDown');
    expect(input().getAttribute('aria-activedescendant')).toBe('meal-product-option-0');
    key('Enter');
    expect(store.getComponentState('meal')?.values.product).toBe('chicken');
    input().blur();
    expect(input().value).toBe('Chicken breast');
  });

  it('sends the typed text to the data source as filter', async () => {
    const resolve = vi.fn(filterProducts);
    await renderData(resolve);
    type('oat');
    await settle();
    expect(optionLabels()).toEqual(['Oat flakes']);
    expect(resolve).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: 'products', filter: 'oat' }),
      expect.anything(),
    );
  });

  it('keeps the chosen label after a later search drops the option', async () => {
    const { store } = await renderData(filterProducts);
    type('skyr');
    await settle();
    expect(optionLabels()).toEqual(['Skyr natural']);
    key('ArrowDown');
    key('Enter');
    type('chicken');
    await settle();
    expect(optionLabels()).toEqual(['Chicken breast']);
    input().blur();
    expect(store.getComponentState('meal')?.values.product).toBe('skyr');
    expect(input().value).toBe('Skyr natural');
  });

  it('keeps the focused input while the store updates mid-typing', async () => {
    await renderData(filterProducts);
    const before = input();
    type('oa');
    await settle();
    expect(optionLabels()).toEqual(['Oat flakes']);
    expect(input()).toBe(before);
    expect(document.activeElement).toBe(before);
    expect(before.value).toBe('oa');
  });

  it('shows the data source error with a retry', async () => {
    await renderData(async () => {
      throw new Error('search down');
    });
    type('a');
    await settle();
    const status = root?.querySelector('.mdma-combobox-status--error');
    expect(status?.textContent).toContain('search down');
    expect(status?.querySelector('button')?.textContent).toBe('Retry');
  });

  it('announces status outside the listbox and retries on Enter', async () => {
    let calls = 0;
    await renderData(async () => {
      calls++;
      throw new Error('search down');
    });
    type('a');
    await settle();
    const status = root?.querySelector('output.mdma-combobox-status');
    expect(status?.closest('[role="listbox"]')).toBeNull();
    expect(root?.querySelector('[role="listbox"]')?.hasAttribute('hidden')).toBe(true);
    expect(input().getAttribute('aria-controls')).toBe('meal-product-listbox');
    const before = calls;
    key('Enter');
    await settle();
    expect(calls).toBe(before + 1);
  });

  it('drops the highlight when the results change', async () => {
    await renderData(filterProducts);
    await settle();
    type('chicken');
    // the debounce hasn't fired: these are still the unfiltered rows
    key('ArrowDown');
    expect(input().getAttribute('aria-activedescendant')).toBe('meal-product-option-0');
    await settle();
    expect(optionLabels()).toEqual(['Chicken breast']);
    expect(input().getAttribute('aria-activedescendant')).toBeNull();
  });

  it('clears a filter left on the slot when the field mounts again', async () => {
    const { store, block } = await renderData(filterProducts);
    type('sky');
    await settle();
    expect(store.getDataState('meal.product')?.filter).toBe('sky');
    unmount();

    remount(block, store);
    await settle();
    expect(store.getDataState('meal.product')?.filter).toBeUndefined();
    expect(store.getDataState('meal.product')?.rows).toEqual(PRODUCTS);
  });

  it('uses the form.combobox override', async () => {
    const Custom: ElementRenderer<FormComboboxElementProps> = (initial) => {
      const node = el('div', { id: initial.id, 'data-count': String(initial.options.length) });
      return {
        el: node,
        update(next) {
          node.setAttribute('data-count', String(next.options.length));
        },
      };
    };
    await renderInline({ elementOverrides: { form: { combobox: Custom as never } } });
    expect(input().getAttribute('data-count')).toBe('3');
  });
});
