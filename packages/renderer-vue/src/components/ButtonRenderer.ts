import { defineComponent, h } from 'vue';
import { blockRendererProps } from '../renderers/renderer-props.js';

export const ButtonRenderer = defineComponent({
  name: 'ButtonRenderer',
  props: blockRendererProps,
  setup(props) {
    return () => {
      const component = props.component;
      if (component.type !== 'button') return null;

      return h(
        'button',
        {
          type: 'button',
          class: `mdma-button mdma-button--${component.variant ?? 'primary'}`,
          'data-component-id': component.id,
          onClick: () => {
            if (component.onAction) {
              props.dispatch({
                type: 'ACTION_TRIGGERED',
                componentId: component.id,
                actionId: component.onAction,
              });
            }
          },
        },
        component.text,
      );
    };
  },
});
