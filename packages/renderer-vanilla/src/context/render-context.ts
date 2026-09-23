import type { ComponentState } from '@mobile-reality/mdma-runtime';
import type { CustomComponent, StoreAction } from '@mobile-reality/mdma-spec';

/** Named option lists a form select can reference by string (`options: countries`). */
export type DataSources = Record<string, Array<{ label: string; value: string }>>;

/** A mounted sub-element (a form input, a submit button) that can be re-fed props. */
export interface ElementInstance<TProps> {
  el: HTMLElement;
  update(props: TProps): void;
}

export type ElementRenderer<TProps> = (props: TProps) => ElementInstance<TProps>;

/**
 * Scoped element overrides, keyed by scope (`'*'` global, `'form'` form-only)
 * then by element name. Resolution: scope → `'*'` → built-in default.
 */
export type ElementOverrides = Record<string, Record<string, ElementRenderer<never>>>;

export interface CustomVariantProps {
  component: CustomComponent;
  props: Record<string, unknown>;
  componentState: ComponentState | undefined;
  dispatch: (action: StoreAction) => void;
  resolveBinding: (expr: string) => unknown;
}

export type CustomVariantRenderer = (
  props: CustomVariantProps,
) => ElementInstance<CustomVariantProps>;

/** Map of a `custom` component's `name` to the variant that draws it. */
export type CustomVariants = Record<string, CustomVariantRenderer>;

/**
 * Host customizations, passed explicitly down the render tree. The framework
 * renderers use context/provide-inject for this; without a framework an ordinary
 * argument is clearer and keeps every renderer a pure function of its inputs.
 */
export interface RenderContext {
  dataSources?: DataSources;
  elementOverrides?: ElementOverrides;
  customVariants?: CustomVariants;
}

export function resolveElementOverride<TProps>(
  context: RenderContext,
  scope: string,
  element: string,
): ElementRenderer<TProps> | undefined {
  const overrides = context.elementOverrides;
  if (!overrides) return undefined;
  return (overrides[scope]?.[element] ?? overrides['*']?.[element]) as
    | ElementRenderer<TProps>
    | undefined;
}
