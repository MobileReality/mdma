import { describe, it, expect, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import type {
  DataRequest,
  DataResult,
  DataSourceMap,
  DocumentStore,
} from '@mobile-reality/mdma-runtime';
import type { MdmaComponent } from '@mobile-reality/mdma-spec';
import { FormRenderer } from '../src/components/FormRenderer.js';
import type { ElementOverrides } from '../src/context/ElementOverridesContext.js';
import { MdmaProvider } from '../src/context/MdmaProvider.js';
import { useComponentState } from '../src/composables/use-document-store.js';
import { flushMicrotasks } from './helpers/flush.js';
import { mdma } from './helpers/doc.js';
import { mountBlock } from './helpers/mount-block.js';

const PRODUCTS = [
  { label: 'Oat flakes', value: 'oat' },
  { label: 'Skyr natural', value: 'skyr' },
  { label: 'Chicken breast', value: 'chicken' },
];

const INLINE = mdma(`
type: form
id: meal
onSubmit: log-meal
fields:
  - name: product
    type: select
    label: "Product"
    searchable: true
    options:
      - label: "Oat flakes"
        value: oat
      - label: "Skyr natural"
        value: skyr
      - label: "Chicken breast"
        value: chicken
`);

const DATA_DRIVEN = mdma(`
type: form
id: meal
onSubmit: log-meal
fields:
  - name: product
    type: select
    label: "Product"
    searchable: true
    options:
      source: products
`);

const searchProducts = async (req: DataRequest): Promise<DataResult> => ({
  rows: PRODUCTS.filter((p) => p.label.toLowerCase().includes((req.filter ?? '').toLowerCase())),
});

function mountForm(
  markdown: string,
  storeDataSources?: DataSourceMap,
  elementOverrides?: ElementOverrides,
) {
  return mountBlock(markdown, FormRenderer, { storeDataSources, elementOverrides });
}

/** Mount the form again against an existing store, as a re-rendered document would. */
function remount(store: DocumentStore, component: MdmaComponent) {
  const Host = defineComponent({
    setup() {
      const componentState = useComponentState(component.id);
      return () =>
        h(FormRenderer, {
          component,
          componentState: componentState.value,
          dispatch: (action: Parameters<DocumentStore['dispatch']>[0]) => store.dispatch(action),
          resolveBinding: (expr: string) => store.resolveBinding(expr),
        });
    },
  });
  return mount(MdmaProvider, { props: { store }, slots: { default: () => h(Host) } });
}

const input = (wrapper: VueWrapper) => wrapper.find('#meal-product');
const optionLabels = (wrapper: VueWrapper) =>
  wrapper.findAll('[role="option"]').map((o) => o.text());

async function type(wrapper: VueWrapper, text: string) {
  await input(wrapper).trigger('focus');
  await input(wrapper).setValue(text);
}

// past the runtime's 150 ms filter debounce, then let the resolver settle
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 200));
  await flushMicrotasks();
}

describe('FormRenderer searchable select', () => {
  it('renders a combobox instead of a native select', async () => {
    const { wrapper } = await mountForm(INLINE);
    expect(input(wrapper).attributes('role')).toBe('combobox');
    expect(wrapper.find('select').exists()).toBe(false);
  });

  it('filters inline options by the typed text', async () => {
    const { wrapper } = await mountForm(INLINE);
    await type(wrapper, 'sky');
    expect(optionLabels(wrapper)).toEqual(['Skyr natural']);
  });

  it('selects with the keyboard and shows the chosen label', async () => {
    const { wrapper, store } = await mountForm(INLINE);
    await type(wrapper, 'chick');
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' });
    expect(input(wrapper).attributes('aria-activedescendant')).toBe('meal-product-option-0');
    await input(wrapper).trigger('keydown', { key: 'Enter' });
    expect(store.getComponentState('meal')?.values.product).toBe('chicken');
    await input(wrapper).trigger('blur');
    expect((input(wrapper).element as HTMLInputElement).value).toBe('Chicken breast');
  });

  it('sends the typed text to the data source as filter', async () => {
    const resolve = vi.fn(searchProducts);
    const { wrapper } = await mountForm(DATA_DRIVEN, { products: resolve });
    await type(wrapper, 'oat');
    await settle();
    expect(optionLabels(wrapper)).toEqual(['Oat flakes']);
    expect(resolve).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: 'products', filter: 'oat' }),
      expect.anything(),
    );
  });

  it('keeps the chosen label after a later search drops the option', async () => {
    const { wrapper, store } = await mountForm(DATA_DRIVEN, { products: searchProducts });
    await type(wrapper, 'skyr');
    await settle();
    expect(optionLabels(wrapper)).toEqual(['Skyr natural']);
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' });
    await input(wrapper).trigger('keydown', { key: 'Enter' });
    await type(wrapper, 'chicken');
    await settle();
    expect(optionLabels(wrapper)).toEqual(['Chicken breast']);
    await input(wrapper).trigger('blur');
    expect(store.getComponentState('meal')?.values.product).toBe('skyr');
    expect((input(wrapper).element as HTMLInputElement).value).toBe('Skyr natural');
  });

  it('shows the data source error with a retry', async () => {
    const resolve = async (): Promise<DataResult> => {
      throw new Error('search down');
    };
    const { wrapper } = await mountForm(DATA_DRIVEN, { products: resolve });
    await type(wrapper, 'a');
    await settle();
    const status = wrapper.find('.mdma-combobox-status--error');
    expect(status.text()).toContain('search down');
    expect(status.find('button').text()).toBe('Retry');
  });

  it('announces status outside the listbox and retries on Enter', async () => {
    let calls = 0;
    const resolve = async (): Promise<DataResult> => {
      calls++;
      throw new Error('search down');
    };
    const { wrapper } = await mountForm(DATA_DRIVEN, { products: resolve });
    await type(wrapper, 'a');
    await settle();
    const status = wrapper.find('output.mdma-combobox-status');
    expect(status.element.closest('[role="listbox"]')).toBeNull();
    expect(wrapper.find('[role="listbox"]').attributes('hidden')).toBeDefined();
    expect(input(wrapper).attributes('aria-controls')).toBe('meal-product-listbox');
    const before = calls;
    await input(wrapper).trigger('keydown', { key: 'Enter' });
    await settle();
    expect(calls).toBe(before + 1);
  });

  it('drops the highlight when the results change', async () => {
    const { wrapper } = await mountForm(DATA_DRIVEN, { products: searchProducts });
    await settle();
    // highlight a row of the stale, unfiltered results before the debounce fires
    await type(wrapper, 'chicken');
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' });
    expect(input(wrapper).attributes('aria-activedescendant')).toBe('meal-product-option-0');
    await settle();
    expect(optionLabels(wrapper)).toEqual(['Chicken breast']);
    expect(input(wrapper).attributes('aria-activedescendant')).toBeUndefined();
  });

  it('clears a filter left on the slot when the field mounts again', async () => {
    const { wrapper, store, component } = await mountForm(DATA_DRIVEN, {
      products: searchProducts,
    });
    await type(wrapper, 'sky');
    await settle();
    expect(store.getDataState('meal.product')?.filter).toBe('sky');
    wrapper.unmount();

    const again = remount(store, component);
    await settle();
    expect(store.getDataState('meal.product')?.filter).toBeUndefined();
    expect(store.getDataState('meal.product')?.rows).toEqual(PRODUCTS);
    again.unmount();
  });

  it('uses the form.combobox override', async () => {
    const Custom = defineComponent({
      props: { id: String, options: Array },
      setup: (props) => () => h('div', { id: props.id, 'data-count': props.options?.length }),
    });
    const { wrapper } = await mountForm(INLINE, undefined, { form: { combobox: Custom } });
    expect(input(wrapper).attributes('data-count')).toBe('3');
  });
});
