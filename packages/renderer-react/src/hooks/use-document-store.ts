import { useSyncExternalStore, useCallback } from 'react';
import type { DocumentState, ComponentState } from '@mdma/runtime';
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

export function useComponentState(componentId: string): ComponentState | undefined {
  const { store } = useMdmaContext();

  const subscribe = useCallback(
    (cb: () => void) => store.subscribe(cb),
    [store],
  );

  return useSyncExternalStore(
    subscribe,
    () => store.getComponentState(componentId),
    () => store.getComponentState(componentId),
  );
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
