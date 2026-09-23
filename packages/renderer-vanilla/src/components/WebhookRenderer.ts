import { el } from '../dom/el.js';
import { withState } from '../renderers/renderer-props.js';

export const WebhookRenderer = withState<{ triggered: boolean }>(
  () => ({ triggered: false }),
  ({ component, componentState, dispatch }, local) => {
    if (component.type !== 'webhook') return el('div');

    const status = (componentState?.values.status as string) ?? 'idle';

    return el('div', { class: 'mdma-webhook', dataset: { 'component-id': component.id } }, [
      component.label && el('span', { class: 'mdma-webhook-label' }, [component.label]),
      el('span', { class: `mdma-webhook-status mdma-webhook-status--${status}` }, [
        `Webhook: ${local.triggered ? 'triggered' : status}`,
      ]),
      !local.triggered &&
        status === 'idle' &&
        el(
          'button',
          {
            type: 'button',
            class: 'mdma-webhook-trigger',
            on: {
              click: () => {
                local.triggered = true;
                // Signals the user fired the webhook. Real HTTP execution is the (unbuilt) webhook
                // engine; this routes the trigger + request shape so an agent/host can act on it.
                dispatch({
                  type: 'INTEGRATION_CALLED',
                  componentId: component.id,
                  integrationId: 'webhook',
                  result: { status: 'triggered', url: component.url, method: component.method },
                });
              },
            },
          },
          ['Trigger webhook'],
        ),
    ]);
  },
);
