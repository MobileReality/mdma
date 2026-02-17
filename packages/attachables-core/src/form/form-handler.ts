import { FormComponentSchema } from '@mdma/spec';
import type { AttachableHandler, ComponentState, AttachableContext } from '@mdma/runtime';

export const formHandler: AttachableHandler = {
  definition: {
    type: 'form',
    schema: FormComponentSchema,
    description: 'Interactive form with fields, validation, and submit action',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const form = FormComponentSchema.parse(props);
    const values: Record<string, unknown> = {};
    for (const field of form.fields) {
      values[field.name] = field.defaultValue ?? (field.type === 'checkbox' ? false : '');
    }
    return {
      id: form.id,
      type: 'form',
      values,
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },

  async onAction(ctx: AttachableContext, actionId: string) {
    if (actionId === 'submit') {
      ctx.dispatch({
        type: 'ACTION_TRIGGERED',
        componentId: ctx.componentId,
        actionId: 'submit',
      });
    }
  },
};
