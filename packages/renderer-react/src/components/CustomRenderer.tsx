import { memo } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useCustomVariants } from '../context/CustomVariantContext.js';

/**
 * Renders a `custom` component by dispatching to the variant registered under
 * its `name`. Unknown names degrade to an inline fallback rather than crashing,
 * mirroring how unknown component types are handled.
 */
export const CustomRenderer = memo(function CustomRenderer({
  component,
  componentState,
  dispatch,
  resolveBinding,
}: MdmaBlockRendererProps) {
  // Hook must run unconditionally; narrow the union afterwards.
  const variants = useCustomVariants();

  if (component.type !== 'custom') return null;

  const Variant = variants[component.name];

  if (!Variant) {
    return (
      <div className="mdma-unknown-component" data-component-id={component.id}>
        Unknown custom component: {component.name}
      </div>
    );
  }

  return (
    <Variant
      component={component}
      props={component.props}
      componentState={componentState}
      dispatch={dispatch}
      resolveBinding={resolveBinding}
    />
  );
});
