import { TableComponentSchema } from '@mobile-reality/mdma-spec';
import type {
  AttachableHandler,
  ComponentState,
  AttachableContext,
} from '@mobile-reality/mdma-runtime';

export const tableHandler: AttachableHandler = {
  definition: {
    type: 'table',
    schema: TableComponentSchema,
    description: 'Data table with optional sorting and filtering',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const table = TableComponentSchema.parse(props);
    return {
      id: table.id,
      type: 'table',
      values: {
        sortColumn: null,
        sortDirection: 'asc',
        page: 0,
      },
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },
};
