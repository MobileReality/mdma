import { memo } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export const CalloutRenderer = memo(function CalloutRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  if (component.type !== 'callout') return null;

  if (componentState?.values.dismissed) return null;

  const variantClass = `mdma-callout--${component.variant ?? 'info'}`;

  return (
    <div className={`mdma-callout ${variantClass}`} data-component-id={component.id} role="alert">
      {component.title && <strong className="mdma-callout-title">{component.title}</strong>}
      <p className="mdma-callout-content">{component.content}</p>
      {component.dismissible && (
        <button
          type="button"
          className="mdma-callout-dismiss"
          aria-label="Dismiss"
          onClick={() =>
            dispatch({
              type: 'FIELD_CHANGED',
              componentId: component.id,
              field: 'dismissed',
              value: true,
            })
          }
        >
          &times;
        </button>
      )}
    </div>
  );
});
