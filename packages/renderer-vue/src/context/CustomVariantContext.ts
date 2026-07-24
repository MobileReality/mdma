import {
  computed,
  defineComponent,
  inject,
  provide,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type PropType,
} from 'vue';
import type { CustomComponent, StoreAction } from '@mobile-reality/mdma-spec';
import type { ComponentState } from '@mobile-reality/mdma-runtime';

/**
 * Props passed to a custom-component variant renderer. The envelope is narrowed
 * to `custom`, and its `props` payload is surfaced directly for convenience.
 * Presentation lives entirely here — the spec only carries intent.
 */
export interface CustomVariantProps {
  component: CustomComponent;
  props: Record<string, unknown>;
  componentState: ComponentState | undefined;
  dispatch: (action: StoreAction) => void;
  resolveBinding: (expr: string) => unknown;
}

/** A Vue component that accepts {@link CustomVariantProps}. */
export type CustomVariantRenderer = Component;

/** Map of custom-component `name` to the variant renderer that draws it. */
export type CustomVariants = Record<string, CustomVariantRenderer>;

export const CustomVariantsKey: InjectionKey<ComputedRef<CustomVariants>> =
  Symbol('mdma-custom-variants');

export type CustomVariantProviderProps = {
  value?: CustomVariants;
};

export const CustomVariantProvider = defineComponent({
  name: 'CustomVariantProvider',
  props: {
    value: { type: Object as PropType<CustomVariants>, default: undefined },
  },
  setup(props, { slots }) {
    provide(
      CustomVariantsKey,
      computed(() => props.value ?? {}),
    );
    return () => slots.default?.();
  },
});

/** Read the registered custom variants, then look up by name. */
export function useCustomVariants(): ComputedRef<CustomVariants> {
  return inject(
    CustomVariantsKey,
    computed(() => ({})),
  );
}
