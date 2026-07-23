import { defineComponent, h } from 'vue';
import { blockRendererProps } from '../renderers/renderer-props.js';
import { useCustomVariants } from '../context/CustomVariantContext.js';

/**
 * Renders a `custom` component by dispatching to the variant registered under
 * its `name`. Unknown names degrade to an inline fallback rather than crashing,
 * mirroring how unknown component types are handled.
 */
export const CustomRenderer = defineComponent({
  name: 'CustomRenderer',
  props: blockRendererProps,
  setup(props) {
    const variants = useCustomVariants();

    return () => {
      const component = props.component;
      if (component.type !== 'custom') return null;

      const Variant = variants.value[component.name];

      if (!Variant) {
        return h(
          'div',
          { class: 'mdma-unknown-component', 'data-component-id': component.id },
          `Unknown custom component: ${component.name}`,
        );
      }

      return h(Variant, {
        component,
        props: component.props,
        componentState: props.componentState,
        dispatch: props.dispatch,
        resolveBinding: props.resolveBinding,
      });
    };
  },
});
