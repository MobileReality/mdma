import { defineComponent, h, ref } from 'vue';
import { blockRendererProps } from '../renderers/renderer-registry.js';

export const WebhookRenderer = defineComponent({
  name: 'WebhookRenderer',
  props: blockRendererProps,
  setup(props) {
    const triggered = ref(false);

    return () => {
      const component = props.component;
      if (component.type !== 'webhook') return null;

      const status = (props.componentState?.values.status as string) ?? 'idle';

      return h('div', { class: 'mdma-webhook', 'data-component-id': component.id }, [
        component.label ? h('span', { class: 'mdma-webhook-label' }, component.label) : null,
        h(
          'span',
          { class: `mdma-webhook-status mdma-webhook-status--${status}` },
          `Webhook: ${triggered.value ? 'triggered' : status}`,
        ),
        !triggered.value && status === 'idle'
          ? h(
              'button',
              {
                type: 'button',
                class: 'mdma-webhook-trigger',
                onClick: () => {
                  triggered.value = true;
                  // Signals the user fired the webhook. Real HTTP execution is the (unbuilt) webhook
                  // engine; this routes the trigger + request shape so an agent/host can act on it.
                  props.dispatch({
                    type: 'INTEGRATION_CALLED',
                    componentId: component.id,
                    integrationId: 'webhook',
                    result: {
                      status: 'triggered',
                      url: component.url,
                      method: component.method,
                    },
                  });
                },
              },
              'Trigger webhook',
            )
          : null,
      ]);
    };
  },
});
