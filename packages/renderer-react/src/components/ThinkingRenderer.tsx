import { memo, type MouseEvent } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

/**
 * Basic built-in thinking renderer.
 * Uses native <details>/<summary> for zero-dependency collapsible.
 * Override with a richer renderer via customizations.
 */
export const ThinkingRenderer = memo(function ThinkingRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  if (component.type !== 'thinking') return null;

  const collapsed = (componentState?.values.collapsed as boolean | undefined) ?? component.collapsed ?? true;
  const status = component.status ?? 'done';
  const label = component.label ?? 'Thinking';

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    dispatch({
      type: 'FIELD_CHANGED',
      componentId: component.id,
      field: 'collapsed',
      value: !collapsed,
    });
  };

  return (
    <details
      className={`mdma-thinking mdma-thinking--${status}`}
      data-component-id={component.id}
      open={!collapsed}
    >
      <summary className="mdma-thinking-summary" onClick={handleClick}>
        {status === 'thinking' && <span className="mdma-thinking-indicator" />}
        <span className="mdma-thinking-label">{label}</span>
      </summary>
      <div className="mdma-thinking-content">{component.content}</div>
    </details>
  );
});
