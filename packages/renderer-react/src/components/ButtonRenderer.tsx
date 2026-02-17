import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export function ButtonRenderer({ component, dispatch }: MdmaBlockRendererProps) {
  if (component.type !== 'button') return null;

  const variantClass = `mdma-button--${component.variant ?? 'primary'}`;

  return (
    <button
      type="button"
      className={`mdma-button ${variantClass}`}
      data-component-id={component.id}
      onClick={() =>
        dispatch({
          type: 'ACTION_TRIGGERED',
          componentId: component.id,
          actionId: component.onAction,
        })
      }
    >
      {component.text}
    </button>
  );
}
