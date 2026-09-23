import type { CustomComponent } from '@mobile-reality/mdma-spec';
import type { CustomVariantProps, ElementInstance } from '../context/render-context.js';
import { el } from '../dom/el.js';
import type {
  MdmaBlockRenderer,
  MdmaBlockRendererProps,
  RendererInstance,
} from '../renderers/renderer-props.js';

const variantPropsOf = (
  component: CustomComponent,
  props: MdmaBlockRendererProps,
): CustomVariantProps => ({
  component,
  props: component.props,
  componentState: props.componentState,
  dispatch: props.dispatch,
  resolveBinding: props.resolveBinding,
});

const unknown = (component: CustomComponent) =>
  el('div', { class: 'mdma-unknown-component', dataset: { 'component-id': component.id } }, [
    `Unknown custom component: ${component.name}`,
  ]);

/**
 * Draws a `custom` component with the variant registered under its `name`. An
 * unregistered name degrades to an inline notice rather than crashing, mirroring
 * how an unknown component type is handled.
 */
export const CustomRenderer: MdmaBlockRenderer = (initial) => {
  let variant: ElementInstance<CustomVariantProps> | undefined;

  const create = (props: MdmaBlockRendererProps): HTMLElement => {
    if (props.component.type !== 'custom') return el('div');
    const component = props.component;
    const factory = props.context.customVariants?.[component.name];
    if (!factory) {
      variant = undefined;
      return unknown(component);
    }
    variant = factory(variantPropsOf(component, props));
    return variant.el;
  };

  const instance: RendererInstance = {
    el: create(initial),
    update(next) {
      if (next.component.type !== 'custom') return;
      const component = next.component;
      const factory = next.context.customVariants?.[component.name];

      // A live variant keeps its own element and is re-fed props, so a custom
      // component with internal state (a canvas, a chart) survives a re-render.
      if (variant && factory) {
        variant.update(variantPropsOf(component, next));
        return;
      }

      const replacement = create(next);
      instance.el.replaceWith(replacement);
      instance.el = replacement;
    },
  };

  return instance;
};
