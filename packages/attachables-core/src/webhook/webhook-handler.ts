import { WebhookComponentSchema } from '@mdma/spec';
import type { AttachableHandler, ComponentState, AttachableContext } from '@mdma/runtime';

export const webhookHandler: AttachableHandler = {
  definition: {
    type: 'webhook',
    schema: WebhookComponentSchema,
    description: 'HTTP webhook integration with policy enforcement',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const webhook = WebhookComponentSchema.parse(props);
    return {
      id: webhook.id,
      type: 'webhook',
      values: { status: 'idle', lastResult: null },
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },

  async onAction(ctx: AttachableContext, actionId: string) {
    if (actionId === 'execute') {
      ctx.policy.enforce('webhook_call');
      ctx.dispatch({
        type: 'INTEGRATION_CALLED',
        componentId: ctx.componentId,
        integrationId: 'webhook',
        result: { status: 'mocked', message: 'Webhook execution placeholder' },
      });
    }
  },
};
