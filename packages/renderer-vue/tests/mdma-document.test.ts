import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { MdmaDocument } from '../src/components/MdmaDocument.js';
import { MdmaThemeProvider, darkTheme } from '../src/theme/MdmaThemeProvider.js';
import { blockRendererProps } from '../src/renderers/renderer-props.js';
import { mdma, parseDoc } from './helpers/doc.js';

const DOC = `# Intake

Some **markdown** first.

${mdma(`
type: form
id: intake
label: "Intake"
fields:
  - name: email
    type: email
    label: "Email"
onSubmit: submit-intake
`)}
${mdma(`
type: button
id: go
text: "Continue"
onAction: continue
`)}`;

async function mountDoc(markdown: string, props: Record<string, unknown> = {}) {
  const { ast, store } = await parseDoc(markdown);
  const wrapper = mount(MdmaDocument, { props: { ast, store, ...props } });
  return { wrapper, store, ast };
}

describe('MdmaDocument', () => {
  it('renders markdown and mdma blocks in document order', async () => {
    const { wrapper } = await mountDoc(DOC);
    expect(wrapper.find('.mdma-document').exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe('Intake');
    expect(wrapper.find('.mdma-markdown-content strong').text()).toBe('markdown');
    expect(wrapper.find('.mdma-form').exists()).toBe(true);
    expect(wrapper.find('button.mdma-button').text()).toBe('Continue');
  });

  it('wires the store, so a field edit reaches it', async () => {
    const { wrapper, store } = await mountDoc(DOC);
    await wrapper.find('#intake-email').setValue('ada@example.com');
    expect(store.getComponentState('intake')?.values.email).toBe('ada@example.com');
  });

  it('applies a built-in theme to its own root', async () => {
    const { wrapper } = await mountDoc(DOC, { theme: 'dark' });
    expect(wrapper.find('.mdma-document').attributes('data-theme')).toBe('dark');
  });

  it('writes a custom theme as inline CSS variables', async () => {
    const { wrapper } = await mountDoc(DOC, { theme: darkTheme });
    const style = wrapper.find('.mdma-document').attributes('style') ?? '';
    expect(style).toContain('--mdma-color-primary');
    expect(wrapper.find('.mdma-document').attributes('data-theme')).toBe('dark');
  });

  it('inherits an ancestor provider theme when it has none of its own', async () => {
    const { ast, store } = await parseDoc(DOC);
    const wrapper = mount(MdmaThemeProvider, {
      props: { theme: 'dark' },
      slots: { default: () => h(MdmaDocument, { ast, store }) },
    });
    expect(wrapper.find('.mdma-document').attributes('data-theme')).toBe('dark');
  });

  it('accepts a bare component override and an elements config', async () => {
    const CustomButton = defineComponent({
      props: blockRendererProps,
      setup: (props) => () =>
        h('a', { class: 'custom-btn' }, (props.component as { text: string }).text),
    });
    const GlassInput = defineComponent({
      props: { id: { type: String, required: true } },
      setup: (props) => () => h('input', { id: props.id, class: 'glass' }),
    });

    const { wrapper } = await mountDoc(DOC, {
      customizations: {
        components: {
          button: CustomButton,
          form: { elements: { input: GlassInput } },
        },
      },
    });

    expect(wrapper.find('a.custom-btn').text()).toBe('Continue');
    expect(wrapper.find('input.glass').exists()).toBe(true);
  });

  it('passes data sources down to form selects', async () => {
    const doc = mdma(`
type: form
id: f
fields:
  - name: country
    type: select
    label: "Country"
    options: countries
onSubmit: save
`);
    const { wrapper } = await mountDoc(doc, {
      customizations: { dataSources: { countries: [{ label: 'Poland', value: 'pl' }] } },
    });
    expect(wrapper.findAll('#f-country option').map((o) => o.text())).toEqual([
      'Select...',
      'Poland',
    ]);
  });

  it('shows a loading skeleton for a block still streaming', async () => {
    // An unterminated fence — what the parser sees mid-stream.
    const streaming = '```mdma\ntype: form\nid: half\n';
    const { wrapper } = await mountDoc(streaming);
    expect(wrapper.find('.mdma-block-loading').exists()).toBe(true);
    expect(wrapper.find('.mdma-block-loading-text').text()).toBe('Loading form component...');
  });

  it('streams a thinking block live instead of showing a skeleton', async () => {
    // Mid-stream the `status` enum is still truncated, so the block fails
    // validation and stays a pending code node — the case the live-stream path
    // exists for.
    const streaming =
      '```mdma\ntype: thinking\nid: t1\nlabel: Planning\nstatus: think\ncontent: |\n  Considering the options\n';
    const { wrapper } = await mountDoc(streaming);

    expect(wrapper.find('.mdma-block-loading').exists()).toBe(false);
    expect(wrapper.find('.mdma-thinking-label').text()).toBe('Planning');
    expect(wrapper.find('.mdma-thinking-content').text()).toContain('Considering the options');
    // A partial thinking block renders as in-progress and expanded.
    expect(wrapper.find('.mdma-thinking').classes()).toContain('mdma-thinking--thinking');
  });

  it('keeps showing a parsed block when a later parse leaves it pending', async () => {
    const complete = mdma(`
type: button
id: go
text: "Continue"
onAction: continue
`);
    const { wrapper, store, ast } = await mountDoc(complete);
    expect(wrapper.find('button.mdma-button').exists()).toBe(true);

    // Re-render the same document with the block back in a pending state, as
    // happens when a streamed re-parse briefly fails validation.
    const pendingAst = {
      ...ast,
      children: [{ type: 'code', lang: 'mdma', value: 'type: button\nid: go\n' }],
    };
    await wrapper.setProps({ ast: pendingAst, store });

    expect(wrapper.find('button.mdma-button').exists()).toBe(true);
    expect(wrapper.find('.mdma-block-loading').exists()).toBe(false);
  });
});
