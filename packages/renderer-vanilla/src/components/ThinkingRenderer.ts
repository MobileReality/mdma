import { el } from '../dom/el.js';
import { stateless } from '../renderers/renderer-props.js';

/** Native `<details>`/`<summary>`, so the collapsible needs no script of its own. */
export const ThinkingRenderer = stateless(({ component, componentState, dispatch }) => {
  if (component.type !== 'thinking') return el('div');

  const collapsed =
    (componentState?.values.collapsed as boolean | undefined) ?? component.collapsed ?? true;
  const status = component.status ?? 'done';

  return el(
    'details',
    {
      class: `mdma-thinking mdma-thinking--${status}`,
      dataset: { 'component-id': component.id },
      open: !collapsed,
    },
    [
      el(
        'summary',
        {
          class: 'mdma-thinking-summary',
          on: {
            // The open/closed state lives in the store, so the native toggle is
            // suppressed and the dispatch drives it instead.
            click: (event: Event) => {
              event.preventDefault();
              dispatch({
                type: 'FIELD_CHANGED',
                componentId: component.id,
                field: 'collapsed',
                value: !collapsed,
              });
            },
          },
        },
        [
          status === 'thinking' && el('span', { class: 'mdma-thinking-indicator' }),
          el('span', { class: 'mdma-thinking-label' }, [component.label ?? 'Thinking']),
        ],
      ),
      el('div', { class: 'mdma-thinking-content' }, [component.content]),
    ],
  );
});
