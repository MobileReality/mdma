import { defineComponent, h } from 'vue';
import { blockRendererProps } from '../renderers/renderer-registry.js';

export const ApprovalGateRenderer = defineComponent({
  name: 'ApprovalGateRenderer',
  props: blockRendererProps,
  setup(props) {
    return () => {
      const component = props.component;
      if (component.type !== 'approval-gate') return null;

      const status = (props.componentState?.values.status as string) ?? 'pending';

      return h(
        'div',
        {
          class: `mdma-approval-gate mdma-approval-gate--${status}`,
          'data-component-id': component.id,
        },
        [
          h('h3', { class: 'mdma-approval-gate-title' }, component.title),
          component.description
            ? h('p', { class: 'mdma-approval-gate-description' }, component.description)
            : null,
          h('div', { class: 'mdma-approval-gate-status' }, ['Status: ', h('strong', status)]),
          status === 'pending'
            ? h('div', { class: 'mdma-approval-gate-actions' }, [
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'mdma-button mdma-button--primary',
                    onClick: () =>
                      props.dispatch({
                        type: 'APPROVAL_GRANTED',
                        componentId: component.id,
                        actor: { id: 'current-user' },
                      }),
                  },
                  'Approve',
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'mdma-button mdma-button--danger',
                    onClick: () =>
                      props.dispatch({
                        type: 'APPROVAL_DENIED',
                        componentId: component.id,
                        actor: { id: 'current-user' },
                        reason: '',
                      }),
                  },
                  'Deny',
                ),
              ])
            : null,
        ],
      );
    };
  },
});
