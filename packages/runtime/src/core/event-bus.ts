import type { StoreAction } from '@mobile-reality/mdma-spec';

export type EventHandler<T = unknown> = (event: T) => void;

export interface TypedEventBus {
  on<K extends StoreAction['type']>(
    type: K,
    handler: EventHandler<Extract<StoreAction, { type: K }>>,
  ): () => void;
  onAny(handler: EventHandler<StoreAction>): () => void;
  emit(action: StoreAction): void;
}

export function createEventBus(): TypedEventBus {
  const handlers = new Map<string, Set<EventHandler>>();
  const anyHandlers = new Set<EventHandler<StoreAction>>();

  return {
    on(type, handler) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler as EventHandler);
      return () => {
        set?.delete(handler as EventHandler);
      };
    },

    onAny(handler) {
      anyHandlers.add(handler);
      return () => {
        anyHandlers.delete(handler);
      };
    },

    emit(action) {
      const set = handlers.get(action.type);
      if (set) {
        for (const handler of set) {
          handler(action);
        }
      }
      for (const handler of anyHandlers) {
        handler(action);
      }
    },
  };
}
