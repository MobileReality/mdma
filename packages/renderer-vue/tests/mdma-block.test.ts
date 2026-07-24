import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import type { MdmaBlock as MdmaBlockType } from '@mobile-reality/mdma-spec';
import { MdmaBlock } from '../src/components/MdmaBlock.js';
import { MdmaProvider } from '../src/context/MdmaProvider.js';
import { blockRendererProps } from '../src/renderers/renderer-props.js';
import { mdma, parseDoc } from './helpers/doc.js';

const BUTTON = mdma(`
type: button
id: go
text: "Continue"
onAction: continue
`);

async function mountBlockFor(markdown: string, renderers?: Record<string, unknown>) {
  const { ast, store } = await parseDoc(markdown);
  const block = ast.children.find(
    (child): child is MdmaBlockType => (child as { type?: string }).type === 'mdmaBlock',
  );
  if (!block) throw new Error('no mdma block parsed');

  const wrapper = mount(MdmaProvider, {
    props: { store },
    slots: { default: () => h(MdmaBlock, { block, renderers }) },
  });
  return { wrapper, store, block };
}

describe('MdmaBlock', () => {
  it('dispatches to the built-in renderer for the component type', async () => {
    const { wrapper } = await mountBlockFor(BUTTON);
    expect(wrapper.find('button.mdma-button').text()).toBe('Continue');
  });

  it('prefers a caller-supplied renderer over the built-in', async () => {
    const CustomButton = defineComponent({
      props: blockRendererProps,
      setup: (props) => () =>
        h('a', { class: 'custom' }, (props.component as { text: string }).text),
    });

    const { wrapper } = await mountBlockFor(BUTTON, { button: CustomButton });
    expect(wrapper.find('a.custom').text()).toBe('Continue');
    expect(wrapper.find('button.mdma-button').exists()).toBe(false);
  });

  it('passes live component state to the renderer', async () => {
    const doc = mdma(`
type: form
id: profile
fields:
  - name: email
    type: email
    label: "Email"
onSubmit: save
`);
    const { wrapper, store } = await mountBlockFor(doc);

    await wrapper.find('#profile-email').setValue('ada@example.com');
    expect(store.getComponentState('profile')?.values.email).toBe('ada@example.com');
    expect((wrapper.find('#profile-email').element as HTMLInputElement).value).toBe(
      'ada@example.com',
    );
  });

  it('falls back to a notice for a component type with no renderer', async () => {
    const { ast, store } = await parseDoc(BUTTON);
    const block = ast.children.find(
      (child): child is MdmaBlockType => (child as { type?: string }).type === 'mdmaBlock',
    ) as MdmaBlockType;
    // A type the registry has never heard of — e.g. a document authored against
    // a newer spec than the renderer package.
    const unknown = {
      ...block,
      component: { ...block.component, type: 'hologram' },
    } as unknown as MdmaBlockType;

    const wrapper = mount(MdmaProvider, {
      props: { store },
      slots: { default: () => h(MdmaBlock, { block: unknown }) },
    });
    expect(wrapper.find('.mdma-unknown-component').text()).toBe('Unknown component type: hologram');
  });
});
