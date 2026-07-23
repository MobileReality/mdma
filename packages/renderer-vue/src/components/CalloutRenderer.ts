import { defineComponent, h } from 'vue';
import { blockRendererProps } from '../renderers/renderer-registry.js';

export const CalloutRenderer = defineComponent({
  name: 'CalloutRenderer',
  props: blockRendererProps,
  setup(props) {
    return () => {
      const component = props.component;
      if (component.type !== 'callout') return null;

      // Dismissal is document state, so a dismissed callout stays dismissed
      // across a re-parse of the same document.
      if (props.componentState?.values.dismissed) return null;

      return h(
        'div',
        {
          class: `mdma-callout mdma-callout--${component.variant ?? 'info'}`,
          'data-component-id': component.id,
          role: 'alert',
        },
        [
          component.title ? h('strong', { class: 'mdma-callout-title' }, component.title) : null,
          h('p', { class: 'mdma-callout-content' }, component.content),
          component.dismissible
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'mdma-callout-dismiss',
                  'aria-label': 'Dismiss',
                  onClick: () =>
                    props.dispatch({
                      type: 'FIELD_CHANGED',
                      componentId: component.id,
                      field: 'dismissed',
                      value: true,
                    }),
                },
                '×',
              )
            : null,
        ],
      );
    };
  },
});
