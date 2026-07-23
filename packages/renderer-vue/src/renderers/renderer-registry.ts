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

export class RendererRegistry {
  private renderers = new Map<string, MdmaBlockRenderer>();

  register(type: string, renderer: MdmaBlockRenderer): void {
    this.renderers.set(type, renderer);
  }

  get(type: string): MdmaBlockRenderer | undefined {
    return this.renderers.get(type);
  }

  has(type: string): boolean {
    return this.renderers.has(type);
  }

  /** Convert to a plain record for passing as the `renderers` prop. */
  toRecord(): Record<string, MdmaBlockRenderer> {
    return Object.fromEntries(this.renderers);
  }
}
