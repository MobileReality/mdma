export type StoreAction =
  | { type: 'FIELD_CHANGED'; componentId: string; field: string; value: unknown }
  | { type: 'ACTION_TRIGGERED'; componentId: string; actionId: string; payload?: unknown }
  | { type: 'COMPONENT_RENDERED'; componentId: string }
  | {
      type: 'APPROVAL_GRANTED';
      componentId: string;
      actor: { id: string; role?: string };
    }
  | {
      type: 'APPROVAL_DENIED';
      componentId: string;
      actor: { id: string; role?: string };
      reason: string;
    }
  | {
      type: 'INTEGRATION_CALLED';
      componentId: string;
      integrationId: string;
      result: unknown;
    };
