import { type ReactNode, createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

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
type MdmaRoot = import('@mobile-reality/mdma-spec').MdmaRoot;
type DataSourceMap = import('@mobile-reality/mdma-runtime').DataSourceMap;

const component = {
  id: 'intake',
  type: 'form',
  sensitive: false,
  disabled: false,
  visible: true,
  onSubmit: 'submit-intake',
  fields: [{ name: 'country', type: 'select', label: 'Country', options: 'countries' }],
};

const ast = {
  type: 'root',
  children: [{ type: 'mdmaBlock', rawYaml: '', component }],
} as unknown as MdmaRoot;

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

async function renderedText(
  storeSources: DataSourceMap | undefined,
  customizationSources?: Record<string, Array<{ label: string; value: string }>>,
) {
  const store = createDocumentStore(ast, { dataSources: storeSources });
  let renderer: ReturnType<typeof create> | undefined;
  await act(async () => {
    renderer = create(
      <MdmaThemeProvider>
        <MdmaProvider store={store} dataSources={customizationSources}>
          <FormRenderer
            component={component as never}
            componentState={store.getComponentState('intake')}
            dispatch={(action) => store.dispatch(action)}
            resolveBinding={(expr) => store.resolveBinding(expr)}
          />
        </MdmaProvider>
      </MdmaThemeProvider>,
    );
    await Promise.resolve();
  });
  const out: string[] = [];
  collectText(renderer?.toJSON(), out);
  return out.join(' ');
}

describe('FormRenderer select with string options', () => {
  it('resolves options from the store data source', async () => {
    const text = await renderedText({ countries: [{ label: 'Poland', value: 'pl' }] });
    expect(text).toContain('Poland');
  });

  it('falls back to customizations.dataSources when the store has no such source', async () => {
    const text = await renderedText(undefined, { countries: [{ label: 'Japan', value: 'jp' }] });
    expect(text).toContain('Japan');
  });
});
