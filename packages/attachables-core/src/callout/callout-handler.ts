import { CalloutComponentSchema } from '@mdma/spec';
import type { AttachableHandler, ComponentState, AttachableContext } from '@mdma/runtime';

export const calloutHandler: AttachableHandler = {
  definition: {
    type: 'callout',
    schema: CalloutComponentSchema,
    description: 'Informational callout box (info, warning, error, success)',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const callout = CalloutComponentSchema.parse(props);
    return {
      id: callout.id,
      type: 'callout',
      values: { dismissed: false },
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },

  async onAction(ctx: AttachableContext, actionId: string) {
    if (actionId === 'dismiss') {
      ctx.dispatch({
        type: 'FIELD_CHANGED',
        componentId: ctx.componentId,
        field: 'dismissed',
        value: true,
      });
    }
  },
};
