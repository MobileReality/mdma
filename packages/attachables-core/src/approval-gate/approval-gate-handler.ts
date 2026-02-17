import { ApprovalGateComponentSchema } from '@mdma/spec';
import type { AttachableHandler, ComponentState, AttachableContext } from '@mdma/runtime';

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

  async onAction(ctx: AttachableContext, actionId: string, payload: unknown) {
    const data = payload as { actor: { id: string; role?: string }; reason?: string };

    if (actionId === 'approve') {
      ctx.policy.enforce('approval_grant');
      ctx.dispatch({
        type: 'APPROVAL_GRANTED',
        componentId: ctx.componentId,
        actor: data.actor,
      });
    } else if (actionId === 'deny') {
      ctx.policy.enforce('approval_deny');
      ctx.dispatch({
        type: 'APPROVAL_DENIED',
        componentId: ctx.componentId,
        actor: data.actor,
        reason: data.reason ?? '',
      });
    }
  },
};
