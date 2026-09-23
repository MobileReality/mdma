import { el } from '../dom/el.js';
import { stateless } from '../renderers/renderer-props.js';

export const ButtonRenderer = stateless(({ component, dispatch }) => {
  if (component.type !== 'button') return el('div');

  return el(
    'button',
    {
      type: 'button',
      class: `mdma-button mdma-button--${component.variant ?? 'primary'}`,
      dataset: { 'component-id': component.id },
      on: {
        click: () => {
          if (!component.onAction) return;
          dispatch({
            type: 'ACTION_TRIGGERED',
            componentId: component.id,
            actionId: component.onAction,
          });
        },
      },
    },
    [component.text],
  );
});
