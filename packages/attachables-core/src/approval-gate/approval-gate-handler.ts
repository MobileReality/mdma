import { ApprovalGateComponentSchema } from '@mobile-reality/mdma-spec';
import type {
  AttachableHandler,
  ComponentState,
  AttachableContext,
} from '@mobile-reality/mdma-runtime';

export const approvalGateHandler: AttachableHandler = {
  definition: {
    type: 'approval-gate',
    schema: ApprovalGateComponentSchema,
    description: 'Requires explicit approval before downstream components become active',
    version: '0.1.0',
  },

  initialize(_ctx: AttachableContext, props: unknown): ComponentState {
    const gate = ApprovalGateComponentSchema.parse(props);
    return {
      id: gate.id,
      type: 'approval-gate',
      values: { status: 'pending', approvals: [] },
      errors: [],
      touched: false,
      visible: true,
      disabled: false,
    };
  },
};
