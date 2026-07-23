import { describe, it, expect } from 'vitest';
import { defineComponent, h, type PropType } from 'vue';
import { CustomRenderer } from '../src/components/CustomRenderer.js';
import { mdma } from './helpers/doc.js';
import { mountBlock } from './helpers/mount-block.js';

const CUSTOM = mdma(`
type: custom
id: sig
name: signature-pad
props:
  penColor: "#333"
`);

const SignaturePad = defineComponent({
  name: 'SignaturePad',
  props: {
    props: { type: Object as PropType<Record<string, unknown>>, required: true },
    dispatch: { type: Function as PropType<(a: unknown) => void>, required: true },
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: 'signature-pad',
          'data-pen': String(props.props.penColor),
          onClick: () =>
            props.dispatch({
              type: 'FIELD_CHANGED',
              componentId: 'sig',
              field: 'signed',
              value: true,
            }),
        },
        'sign here',
      );
  },
});

describe('CustomRenderer', () => {
  it('dispatches to the variant registered under the component name', async () => {
    const { wrapper } = await mountBlock(CUSTOM, CustomRenderer, {
      customVariants: { 'signature-pad': SignaturePad },
    });
    const pad = wrapper.find('.signature-pad');
    expect(pad.exists()).toBe(true);
    // The spec's `props` payload is surfaced to the variant directly.
    expect(pad.attributes('data-pen')).toBe('#333');
  });

  it('hands the variant a working dispatch', async () => {
    const { wrapper, store } = await mountBlock(CUSTOM, CustomRenderer, {
      customVariants: { 'signature-pad': SignaturePad },
    });
    await wrapper.find('.signature-pad').trigger('click');
    expect(store.getComponentState('sig')?.values.signed).toBe(true);
  });

  it('degrades to an inline notice for an unregistered name', async () => {
    const { wrapper } = await mountBlock(CUSTOM, CustomRenderer);
    expect(wrapper.find('.mdma-unknown-component').text()).toBe(
      'Unknown custom component: signature-pad',
    );
  });
});
