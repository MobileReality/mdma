import { ButtonComponentSchema } from '@mdma/spec';
import type { AttachableHandler, ComponentState, AttachableContext } from '@mdma/runtime';

export const buttonHandler: AttachableHandler = {
  definition: {
    type: 'button',
    schema: ButtonComponentSchema,
    description: 'Clickable button that triggers an action',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const button = ButtonComponentSchema.parse(props);
    return {
      id: button.id,
      type: 'button',
      values: {},
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },

  async onAction(ctx: AttachableContext, actionId: string) {
    ctx.dispatch({
      type: 'ACTION_TRIGGERED',
      componentId: ctx.componentId,
      actionId,
    });
  },
};
