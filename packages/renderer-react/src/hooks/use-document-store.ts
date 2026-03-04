import { useSyncExternalStore, useCallback, useRef } from 'react';
import type { DocumentState, ComponentState } from '@mobile-reality/mdma-runtime';
import { useMdmaContext } from '../context/MdmaProvider.js';

export function useDocumentStore() {
  const { store } = useMdmaContext();
  return store;
}

export function useDocumentState(): DocumentState {
  const { store } = useMdmaContext();

  return useSyncExternalStore(
    store.subscribe,
    () => store.getState(),
    () => store.getState(),
  );
}

/**
 * Returns a snapshot of the component state that only changes reference
 * when the component's values actually change. This prevents unnecessary
 * re-renders of memoized renderers when other components update.
 */
export function useComponentState(componentId: string): ComponentState | undefined {
  const { store } = useMdmaContext();
  const cachedRef = useRef<ComponentState | undefined>(undefined);

  const subscribe = useCallback(
    (cb: () => void) => store.subscribe(cb),
    [store],
  );

  const getSnapshot = useCallback(() => {
    const current = store.getComponentState(componentId);
    if (!current) {
      cachedRef.current = undefined;
      return undefined;
    }
    // Only create a new snapshot if values actually changed
    const prev = cachedRef.current;
    if (
      prev &&
      prev.id === current.id &&
      prev.touched === current.touched &&
      prev.visible === current.visible &&
      prev.disabled === current.disabled &&
      prev.values === current.values &&
      prev.errors === current.errors
    ) {
      return prev;
    }
    const snapshot = { ...current };
    cachedRef.current = snapshot;
    return snapshot;
  }, [store, componentId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useBinding<T = unknown>(expression: string): T {
  const { store } = useMdmaContext();

  const subscribe = useCallback(
    (cb: () => void) => store.subscribe(cb),
    [store],
  );

  return useSyncExternalStore(
    subscribe,
    () => store.resolveBinding(expression) as T,
    () => store.resolveBinding(expression) as T,
  );
}
