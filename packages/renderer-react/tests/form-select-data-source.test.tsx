import { afterEach, describe, expect, it } from 'vitest';

// biome-ignore lint/suspicious/noExplicitAny: react's act() global switch has no typed home
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
import { type DataSourceMap, createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { FormRenderer } from '../src/components/FormRenderer.js';
import { MdmaProvider } from '../src/context/MdmaProvider.js';

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

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

async function renderForm(
  storeSources: DataSourceMap | undefined,
  customizationSources?: Record<string, Array<{ label: string; value: string }>>,
) {
  const store = createDocumentStore(ast, { dataSources: storeSources });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <MdmaProvider store={store} dataSources={customizationSources}>
        <FormRenderer
          component={component as never}
          componentState={store.getComponentState('intake')}
          dispatch={(action) => store.dispatch(action)}
          resolveBinding={(expr) => store.resolveBinding(expr)}
        />
      </MdmaProvider>,
    );
    await Promise.resolve();
  });
  return Array.from(container.querySelectorAll('#intake-country option')).map(
    (option) => option.textContent,
  );
}

describe('FormRenderer select with string options', () => {
  it('resolves options from the store data source', async () => {
    const labels = await renderForm({ countries: [{ label: 'Poland', value: 'pl' }] });
    expect(labels).toEqual(['Select...', 'Poland']);
  });

  it('falls back to customizations.dataSources when the store has no such source', async () => {
    const labels = await renderForm(undefined, { countries: [{ label: 'Japan', value: 'jp' }] });
    expect(labels).toEqual(['Select...', 'Japan']);
  });
});
