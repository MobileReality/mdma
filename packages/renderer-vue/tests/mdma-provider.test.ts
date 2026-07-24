import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { MdmaProvider, useMdmaContext } from '../src/context/MdmaProvider.js';
import { mdma, parseDoc } from './helpers/doc.js';

const DOC = mdma(`
type: button
id: go
text: "Go"
onAction: go-action
`);

const Probe = defineComponent({
  setup() {
    const ctx = useMdmaContext();
    return () =>
      h('i', String(ctx.value.dataSources?.countries?.[0]?.label ?? ctx.value.store !== undefined));
  },
});

describe('MdmaProvider', () => {
  it('provides the store to descendants without rendering a wrapper element', async () => {
    const { store } = await parseDoc(DOC);
    const wrapper = mount(MdmaProvider, {
      props: { store },
      slots: { default: () => h(Probe) },
    });

    expect(wrapper.find('i').text()).toBe('true');
    // The provider is transparent: it renders the slot and nothing around it.
    expect(wrapper.html()).toBe('<i>true</i>');
  });

  it('passes data sources through', async () => {
    const { store } = await parseDoc(DOC);
    const wrapper = mount(MdmaProvider, {
      props: { store, dataSources: { countries: [{ label: 'Poland', value: 'pl' }] } },
      slots: { default: () => h(Probe) },
    });

    expect(wrapper.find('i').text()).toBe('Poland');
  });

  it('throws a wiring error when used with no provider above', () => {
    expect(() => mount(Probe)).toThrow(/must be used within a MdmaProvider/);
  });
});
