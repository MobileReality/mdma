import {
  computed,
  shallowRef,
  toValue,
  watchEffect,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';
import type { ComponentState, DocumentState, DocumentStore } from '@mobile-reality/mdma-runtime';
import { useMdmaContext, type MdmaContextValue } from '../context/MdmaProvider.js';

/**
 * A counter bumped on every store notification. The store mutates its state in
 * place, so there is nothing for Vue's reactivity to track — this is the bridge
 * between `store.subscribe` and the reactive graph, and every composable below
 * reads it to declare "recompute when the document changes".
 *
 * Re-subscribes if the provided store is swapped (which the AG-UI bridge does on
 * re-parse), and unsubscribes with the owning effect scope.
 */
function useStoreTick(ctx: ComputedRef<MdmaContextValue>): ShallowRef<number> {
  const tick = shallowRef(0);
  watchEffect((onCleanup) => {
    const unsubscribe = ctx.value.store.subscribe(() => {
      tick.value++;
    });
    onCleanup(unsubscribe);
  });
  return tick;
}

/** The document store provided by the nearest `MdmaProvider` / `MdmaDocument`. */
export function useDocumentStore(): ComputedRef<DocumentStore> {
  const ctx = useMdmaContext();
  return computed(() => ctx.value.store);
}

/**
 * The whole document state, recomputed on every store notification.
 *
 * The returned object is a fresh shallow wrapper each time: the store mutates
 * its state in place, so handing back the same reference would make the computed
 * look unchanged and consumers would never re-render.
 */
export function useDocumentState(): ComputedRef<DocumentState> {
  const ctx = useMdmaContext();
  const tick = useStoreTick(ctx);
  return computed(() => {
    tick.value;
    return { ...ctx.value.store.getState() };
  });
}

/**
 * A component's state, as a snapshot whose identity only changes when that
 * component's own fields change. Without this, every store notification — a
 * keystroke in an unrelated form — would hand every renderer a new object and
 * defeat Vue's render caching.
 */
export function useComponentState(
  componentId: MaybeRefOrGetter<string>,
): ComputedRef<ComponentState | undefined> {
  const ctx = useMdmaContext();
  const tick = useStoreTick(ctx);
  let cached: ComponentState | undefined;

  return computed(() => {
    tick.value;
    const current = ctx.value.store.getComponentState(toValue(componentId));
    if (!current) {
      cached = undefined;
      return undefined;
    }
    // Only mint a new snapshot when this component's values actually changed.
    const prev = cached;
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
    cached = snapshot;
    return snapshot;
  });
}

/** Resolve a `{{binding}}` expression, kept current as the document changes. */
export function useBinding<T = unknown>(expression: MaybeRefOrGetter<string>): ComputedRef<T> {
  const ctx = useMdmaContext();
  const tick = useStoreTick(ctx);
  return computed(() => {
    tick.value;
    return ctx.value.store.resolveBinding(toValue(expression)) as T;
  });
}
