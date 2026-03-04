import type { AttachableDefinition } from '@mobile-reality/mdma-spec';

export interface ComponentState {
  id: string;
  type: string;
  values: Record<string, unknown>;
  errors: Array<{ field: string; message: string }>;
  touched: boolean;
  visible: boolean;
  disabled: boolean;
}

export interface AttachableContext {
  componentId: string;
  dispatch: (action: import('@mobile-reality/mdma-spec').StoreAction) => void;
  getState: () => Record<string, unknown>;
  resolveBinding: (expr: string) => unknown;
  policy: { enforce: (action: string) => void };
}

export interface AttachableHandler<TProps = unknown> {
  definition: AttachableDefinition<TProps>;
  initialize?: (ctx: AttachableContext, props: TProps) => ComponentState;
  onAction?: (ctx: AttachableContext, actionId: string, payload: unknown) => Promise<void> | void;
  onStateChange?: (ctx: AttachableContext, newState: ComponentState) => void;
}

export class AttachableRegistry {
  private handlers = new Map<string, AttachableHandler>();

  register(handler: AttachableHandler): void {
    this.handlers.set(handler.definition.type, handler);
  }

  get(type: string): AttachableHandler | undefined {
    return this.handlers.get(type);
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  list(): AttachableDefinition[] {
    return Array.from(this.handlers.values()).map((h) => h.definition);
  }

  get size(): number {
    return this.handlers.size;
  }
}
