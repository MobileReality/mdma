import {
  computed,
  defineComponent,
  inject,
  provide,
  type ComputedRef,
  type InjectionKey,
  type PropType,
} from 'vue';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';

/** Named collections of select options that form fields can reference by string. */
export type DataSources = Record<string, Array<{ label: string; value: string }>>;

export interface MdmaContextValue {
  store: DocumentStore;
  dataSources?: DataSources;
}

export const MdmaContextKey: InjectionKey<ComputedRef<MdmaContextValue>> = Symbol('mdma-context');

/**
 * The nearest provided store + data sources. Throws when called outside a
 * `MdmaProvider` (or a `MdmaDocument`, which provides one itself) — a missing
 * store is a wiring bug, not a state a renderer should try to draw around.
 */
export function useMdmaContext(): ComputedRef<MdmaContextValue> {
  const ctx = inject(MdmaContextKey, null);
  if (!ctx) {
    throw new Error('useMdmaContext must be used within a MdmaProvider');
  }
  return ctx;
}

export type MdmaProviderProps = {
  store: DocumentStore;
  dataSources?: DataSources;
};

/**
 * Provides the document store to every MDMA renderer below it. Renders its
 * default slot untouched — no wrapper element, so it can sit anywhere in a tree.
 */
export const MdmaProvider = defineComponent({
  name: 'MdmaProvider',
  props: {
    store: { type: Object as PropType<DocumentStore>, required: true },
    dataSources: { type: Object as PropType<DataSources>, default: undefined },
  },
  setup(props, { slots }) {
    provide(
      MdmaContextKey,
      computed(() => ({ store: props.store, dataSources: props.dataSources })),
    );
    return () => slots.default?.();
  },
});
