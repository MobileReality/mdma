import type { Component, PropType } from 'vue';
import type { MdmaComponent, StoreAction } from '@mobile-reality/mdma-spec';
import type { ComponentState } from '@mobile-reality/mdma-runtime';

/** The props every block renderer receives from `MdmaBlock`. */
export interface MdmaBlockRendererProps {
  component: MdmaComponent;
  componentState: ComponentState | undefined;
  dispatch: (action: StoreAction) => void;
  resolveBinding: (expr: string) => unknown;
}

/** A Vue component that accepts {@link MdmaBlockRendererProps}. */
export type MdmaBlockRenderer = Component;

/**
 * Runtime prop declaration matching {@link MdmaBlockRendererProps}. Spread it
 * into a `defineComponent` so a custom renderer declares exactly the props
 * `MdmaBlock` passes — Vue would otherwise drop them onto the root element as
 * attributes.
 *
 * This lives apart from `renderer-registry.ts` on purpose: the registry imports
 * every built-in renderer, and each renderer needs this declaration, so keeping
 * them in one module would be a cycle. Unlike React's type-only props, this
 * value is read while the component modules evaluate, so the cycle would
 * actually break at runtime.
 *
 * @example
 * ```ts
 * defineComponent({
 *   props: blockRendererProps,
 *   setup(props) { ... },
 * })
 * ```
 */
export const blockRendererProps = {
  component: { type: Object as PropType<MdmaComponent>, required: true as const },
  componentState: { type: Object as PropType<ComponentState>, default: undefined },
  dispatch: { type: Function as PropType<(action: StoreAction) => void>, required: true as const },
  resolveBinding: {
    type: Function as PropType<(expr: string) => unknown>,
    required: true as const,
  },
};
