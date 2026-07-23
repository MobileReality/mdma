import { defineComponent, h } from 'vue';
import { blockRendererProps } from '../renderers/renderer-registry.js';

/**
 * Basic built-in thinking renderer.
 * Uses native <details>/<summary> for a zero-dependency collapsible.
 * Override with a richer renderer via customizations.
 */
export const ThinkingRenderer = defineComponent({
  name: 'ThinkingRenderer',
  props: blockRendererProps,
  setup(props) {
    return () => {
      const component = props.component;
      if (component.type !== 'thinking') return null;

      const collapsed =
        (props.componentState?.values.collapsed as boolean | undefined) ??
        component.collapsed ??
        true;
      const status = component.status ?? 'done';
      const label = component.label ?? 'Thinking';

      return h(
        'details',
        {
          class: `mdma-thinking mdma-thinking--${status}`,
          'data-component-id': component.id,
          open: !collapsed,
        },
        [
          h(
            'summary',
            {
              class: 'mdma-thinking-summary',
              // The open/closed state lives in the store, so the native toggle is
              // suppressed and the dispatch drives it instead.
              onClick: (e: Event) => {
                e.preventDefault();
                props.dispatch({
                  type: 'FIELD_CHANGED',
                  componentId: component.id,
                  field: 'collapsed',
                  value: !collapsed,
                });
              },
            },
            [
              status === 'thinking' ? h('span', { class: 'mdma-thinking-indicator' }) : null,
              h('span', { class: 'mdma-thinking-label' }, label),
            ],
          ),
          h('div', { class: 'mdma-thinking-content' }, component.content),
        ],
      );
    };
  },
});
