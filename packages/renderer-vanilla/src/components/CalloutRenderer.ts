import { el } from '../dom/el.js';
import { stateless } from '../renderers/renderer-props.js';

export const CalloutRenderer = stateless(({ component, componentState, dispatch }) => {
  if (component.type !== 'callout') return el('div');

  // Dismissal is document state, so a dismissed callout stays dismissed across a
  // re-parse of the same document. An empty span keeps the slot without markup.
  if (componentState?.values.dismissed) return el('span', { class: 'mdma-callout--dismissed' });

  return el(
    'div',
    {
      class: `mdma-callout mdma-callout--${component.variant ?? 'info'}`,
      dataset: { 'component-id': component.id },
      role: 'alert',
    },
    [
      component.title && el('strong', { class: 'mdma-callout-title' }, [component.title]),
      el('p', { class: 'mdma-callout-content' }, [component.content]),
      component.dismissible &&
        el(
          'button',
          {
            type: 'button',
            class: 'mdma-callout-dismiss',
            'aria-label': 'Dismiss',
            on: {
              click: () =>
                dispatch({
                  type: 'FIELD_CHANGED',
                  componentId: component.id,
                  field: 'dismissed',
                  value: true,
                }),
            },
          },
          ['×'],
        ),
    ],
  );
});
