import { mount } from '@vue/test-utils';
import { defineComponent, h, type Component } from 'vue';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaBlock, MdmaComponent } from '@mobile-reality/mdma-spec';
import { MdmaProvider, type DataSources } from '../../src/context/MdmaProvider.js';
import {
  ElementOverridesProvider,
  type ElementOverrides,
} from '../../src/context/ElementOverridesContext.js';
import {
  CustomVariantProvider,
  type CustomVariants,
} from '../../src/context/CustomVariantContext.js';
import { useComponentState } from '../../src/composables/use-document-store.js';
import { parseDoc } from './doc.js';

export interface MountBlockOptions {
  dataSources?: DataSources;
  elementOverrides?: ElementOverrides;
  customVariants?: CustomVariants;
}

/**
 * Parse a one-block document and mount `Renderer` with exactly the props
 * `MdmaBlock` passes it, wired to a live store — so a test can dispatch and
 * assert on what re-renders.
 */
export async function mountBlock(
  markdown: string,
  Renderer: Component,
  options: MountBlockOptions = {},
) {
  const { ast, store } = await parseDoc(markdown);
  const block = ast.children.find(
    (child): child is MdmaBlock => (child as { type?: string }).type === 'mdmaBlock',
  );
  if (!block) throw new Error('no mdma block parsed — check the fixture YAML validates');

  const component: MdmaComponent = block.component;

  const Host = defineComponent({
    setup() {
      const componentState = useComponentState(component.id);
      return () =>
        h(Renderer, {
          component,
          componentState: componentState.value,
          dispatch: (action: Parameters<DocumentStore['dispatch']>[0]) => store.dispatch(action),
          resolveBinding: (expr: string) => store.resolveBinding(expr),
        });
    },
  });

  const wrapper = mount(MdmaProvider, {
    props: { store, dataSources: options.dataSources },
    slots: {
      default: () =>
        h(
          CustomVariantProvider,
          { value: options.customVariants },
          {
            default: () =>
              h(
                ElementOverridesProvider,
                { value: options.elementOverrides },
                { default: () => h(Host) },
              ),
          },
        ),
    },
  });

  return { wrapper, store, component, ast };
}
