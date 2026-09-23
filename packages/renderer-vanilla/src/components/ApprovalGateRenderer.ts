import { el } from '../dom/el.js';
import { stateless } from '../renderers/renderer-props.js';

export const ApprovalGateRenderer = stateless(({ component, componentState, dispatch }) => {
  if (component.type !== 'approval-gate') return el('div');

  const status = (componentState?.values.status as string) ?? 'pending';

  return el(
    'div',
    {
      class: `mdma-approval-gate mdma-approval-gate--${status}`,
      dataset: { 'component-id': component.id },
    },
    [
      el('h3', { class: 'mdma-approval-gate-title' }, [component.title]),
      component.description &&
        el('p', { class: 'mdma-approval-gate-description' }, [component.description]),
      el('div', { class: 'mdma-approval-gate-status' }, ['Status: ', el('strong', {}, [status])]),
      status === 'pending' &&
        el('div', { class: 'mdma-approval-gate-actions' }, [
          el(
            'button',
            {
              type: 'button',
              class: 'mdma-button mdma-button--primary',
              on: {
                click: () =>
                  dispatch({
                    type: 'APPROVAL_GRANTED',
                    componentId: component.id,
                    actor: { id: 'current-user' },
                  }),
              },
            },
            ['Approve'],
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'mdma-button mdma-button--danger',
              on: {
                click: () =>
                  dispatch({
                    type: 'APPROVAL_DENIED',
                    componentId: component.id,
                    actor: { id: 'current-user' },
                    reason: '',
                  }),
              },
            },
            ['Deny'],
          ),
        ]),
    ],
  );
});
