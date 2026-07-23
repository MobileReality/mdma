import { computed, defineComponent, h, type PropType } from 'vue';
import type { MdmaBlock as MdmaBlockType, StoreAction } from '@mobile-reality/mdma-spec';
import { useComponentState, useDocumentStore } from '../composables/use-document-store.js';
import { defaultRenderers } from '../renderers/renderer-registry.js';
import type { MdmaBlockRenderer } from '../renderers/renderer-props.js';

export type MdmaBlockProps = {
  block: MdmaBlockType;
  renderers?: Record<string, MdmaBlockRenderer>;
};

/**
 * Renders one parsed MDMA block: looks up the renderer for its component type
 * (caller-supplied first, then the built-ins) and hands it the component, its
 * state, and the two store callbacks.
 */
export const MdmaBlock = defineComponent({
  name: 'MdmaBlock',
  props: {
    block: { type: Object as PropType<MdmaBlockType>, required: true },
    renderers: {
      type: Object as PropType<Record<string, MdmaBlockRenderer>>,
      default: undefined,
    },
  },
  setup(props) {
    const store = useDocumentStore();
    const componentState = useComponentState(() => props.block.component.id);

    const dispatch = (action: StoreAction) => store.value.dispatch(action);
    const resolveBinding = (expr: string) => store.value.resolveBinding(expr);

    const Renderer = computed<MdmaBlockRenderer | undefined>(() => {
      const type = props.block.component.type;
      return props.renderers?.[type] ?? defaultRenderers[type];
    });

    return () => {
      if (!Renderer.value) {
        return h(
          'div',
          { class: 'mdma-unknown-component' },
          `Unknown component type: ${props.block.component.type}`,
        );
      }

      return h(Renderer.value, {
        component: props.block.component,
        componentState: componentState.value,
        dispatch,
        resolveBinding,
      });
    };
  },
});
