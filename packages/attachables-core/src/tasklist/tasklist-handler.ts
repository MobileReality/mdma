import { TasklistComponentSchema } from '@mdma/spec';
import type { AttachableHandler, ComponentState, AttachableContext } from '@mdma/runtime';

export const tasklistHandler: AttachableHandler = {
  definition: {
    type: 'tasklist',
    schema: TasklistComponentSchema,
    description: 'Checklist of tasks with completion tracking',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const tasklist = TasklistComponentSchema.parse(props);
    const values: Record<string, unknown> = {};
    for (const item of tasklist.items) {
      values[item.id] = item.checked;
    }
    return {
      id: tasklist.id,
      type: 'tasklist',
      values,
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },

  async onAction(ctx: AttachableContext, actionId: string, payload: unknown) {
    if (actionId === 'toggle') {
      const { itemId, checked } = payload as { itemId: string; checked: boolean };
      ctx.dispatch({
        type: 'FIELD_CHANGED',
        componentId: ctx.componentId,
        field: itemId,
        value: checked,
      });
    }
  },
};
