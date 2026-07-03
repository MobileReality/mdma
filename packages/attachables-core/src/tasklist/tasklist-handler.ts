import { TasklistComponentSchema } from '@mobile-reality/mdma-spec';
import type {
  AttachableHandler,
  ComponentState,
  AttachableContext,
} from '@mobile-reality/mdma-runtime';

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
};
