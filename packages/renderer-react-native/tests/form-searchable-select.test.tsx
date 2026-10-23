import type {
  DataRequest,
  DataResult,
  DataSourceMap,
  DocumentStore,
} from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import { type ReactNode, createElement } from 'react';
import { type ReactTestInstance, act, create } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
const { FormRenderer } = await import('../src/components/FormRenderer.js');
const { useComponentState } = await import('../src/hooks/use-document-store.js');

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

function astWith(component: unknown) {
  return {
    type: 'root',
    children: [{ type: 'mdmaBlock', rawYaml: '', component }],
  } as unknown as MdmaRoot;
}

let renderer: ReturnType<typeof create> | undefined;

afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
});

async function renderForm(
  options: unknown,
  dataSources?: DataSourceMap,
  existing?: DocumentStore,
): Promise<DocumentStore> {
  const component = formWith(options);
  const store = existing ?? createDocumentStore(astWith(component), { dataSources });
  const Form = () => (
    <FormRenderer
      component={component as never}
      componentState={useComponentState('meal')}
      dispatch={(action) => store.dispatch(action)}
      resolveBinding={(expr) => store.resolveBinding(expr)}
    />
  );
  await act(async () => {
    renderer = create(
      <MdmaThemeProvider>
        <MdmaProvider store={store}>
          <Form />
        </MdmaProvider>
      </MdmaThemeProvider>,
    );
    await Promise.resolve();
  });
  return store;
}

function hosts(type: string): ReactTestInstance[] {
  return renderer!.root.findAll((n) => n.type === type);
}

function input(): ReactTestInstance {
  return hosts('rn-textinput')[0];
}

function textOf(node: ReactTestInstance | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(textOf).join('');
}

function optionLabels(): string[] {
  return hosts('rn-pressable')
    .filter((n) => n.props.role === 'option')
    .map(textOf);
}

async function type(text: string) {
  await act(async () => {
    input().props.onFocus();
    input().props.onChangeText(text);
  });
}

async function pick(label: string) {
  const option = hosts('rn-pressable').find(
    (n) => n.props.role === 'option' && textOf(n) === label,
  );
  await act(async () => option!.props.onPress());
}

async function blur() {
  await act(async () => input().props.onBlur());
}

// past the combobox's 150 ms deferred close
async function waitForClose() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
}

// past the runtime's 150 ms filter debounce, then let the resolver settle
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

describe('FormRenderer searchable select', () => {
  it('renders a search input instead of option chips', async () => {
    await renderForm(PRODUCTS);
    expect(input().props.accessibilityRole).toBe('combobox');
    expect(input().props.placeholder).toBe('Search...');
    expect(optionLabels()).toEqual([]);
  });

  it('lists all inline options on focus and filters them by the typed text', async () => {
    await renderForm(PRODUCTS);
    await act(async () => input().props.onFocus());
    expect(optionLabels()).toEqual(['Oat flakes', 'Skyr natural', 'Chicken breast']);
    await type('SKY ');
    expect(optionLabels()).toEqual(['Skyr natural']);
  });

  it('shows "No matches" when nothing matches', async () => {
    await renderForm(PRODUCTS);
    await type('pizza');
    expect(optionLabels()).toEqual([]);
    expect(textOf(renderer!.root)).toContain('No matches');
  });

  it('selects an option and shows its label', async () => {
    const store = await renderForm(PRODUCTS);
    await type('chick');
    await pick('Chicken breast');
    expect(store.getComponentState('meal')?.values.product).toBe('chicken');
    expect(input().props.value).toBe('Chicken breast');
    expect(optionLabels()).toEqual([]);
  });

  it('still picks an option after the input blurs first', async () => {
    const store = await renderForm(PRODUCTS);
    await type('oat');
    await blur();
    expect(optionLabels()).toEqual(['Oat flakes']);
    await pick('Oat flakes');
    expect(store.getComponentState('meal')?.values.product).toBe('oat');
  });

  it('closes and shows the selected label when focus leaves without a pick', async () => {
    await renderForm(PRODUCTS);
    await type('chick');
    await pick('Chicken breast');
    await type('sky');
    expect(input().props.value).toBe('sky');
    expect(input().props.accessibilityState).toMatchObject({ expanded: true });
    await blur();
    await waitForClose();
    expect(input().props.value).toBe('Chicken breast');
    expect(optionLabels()).toEqual([]);
    expect(input().props.accessibilityState).toMatchObject({ expanded: false });
  });

  it('clears a data filter left by an earlier mount', async () => {
    const resolve = async (): Promise<DataResult> => ({ rows: PRODUCTS });
    const store = await renderForm({ source: 'products' }, { products: resolve });
    await type('oat');
    expect(store.getDataState('meal.product')?.filter).toBe('oat');
    act(() => renderer!.unmount());
    await renderForm({ source: 'products' }, undefined, store);
    expect(store.getDataState('meal.product')?.filter).toBeUndefined();
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

  it('keeps the input mounted and shows "Searching..." while the data source loads', async () => {
    const resolve = () => new Promise<DataResult>(() => {});
    await renderForm({ source: 'products' }, { products: resolve });
    await type('oat');
    expect(input()).toBeDefined();
    expect(input().props.accessibilityState).toMatchObject({ busy: true });
    expect(textOf(renderer!.root)).toContain('Searching...');
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
    await pick('Skyr natural');
    await type('chicken');
    await settle();
    expect(optionLabels()).toEqual(['Chicken breast']);
    await blur();
    expect(store.getComponentState('meal')?.values.product).toBe('skyr');
    expect(input().props.value).toBe('Skyr natural');
  });

  it('shows the data source error with a retry', async () => {
    const resolve = vi.fn(async (): Promise<DataResult> => {
      throw new Error('search down');
    });
    await renderForm({ source: 'products' }, { products: resolve });
    await type('a');
    await settle();
    expect(textOf(renderer!.root)).toContain('search down');
    const alert = hosts('rn-text').find((n) => n.props.accessibilityRole === 'alert');
    expect(alert && textOf(alert)).toBe('search down');
    const retry = hosts('rn-pressable').find((n) => textOf(n) === 'Retry');
    expect(retry?.props.accessibilityRole).toBe('button');
    const calls = resolve.mock.calls.length;
    await act(async () => retry!.props.onPress());
    await settle();
    expect(resolve.mock.calls.length).toBeGreaterThan(calls);
  });
});
