import { memo } from 'react';
import type { MdmaBlockRendererProps } from '@mobile-reality/mdma-renderer-react';
import type { MdmaCustomizations } from '../ChatView.js';
import { customizations as baseCustomizations } from '../custom-components.js';

/**
 * Preview-pane-specific callout renderer. The base `CustomCalloutRenderer`
 * is used across the demo, so changing it would affect Agent Chat and the
 * other views. This renderer emits its own `.preview-callout` markup and
 * is wired only via `previewCustomizations` below, keeping the polished
 * look local to the Insurance Preview page.
 */

const VARIANT_ICONS: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  success: '✅',
};

const PreviewCalloutRenderer = memo(function PreviewCalloutRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  if (component.type !== 'callout') return null;
  if (componentState?.values.dismissed) return null;

  const variant = (component.variant as string | undefined) ?? 'info';
  const icon = VARIANT_ICONS[variant] ?? VARIANT_ICONS.info;

  return (
    <div
      className={`preview-callout preview-callout--${variant}`}
      data-component-id={component.id}
      role="alert"
    >
      <span className="preview-callout-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="preview-callout-body">
        {component.title && <div className="preview-callout-title">{component.title}</div>}
        {component.content && <p className="preview-callout-content">{component.content}</p>}
      </div>
      {component.dismissible && (
        <button
          type="button"
          className="preview-callout-dismiss"
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
          ×
        </button>
      )}
    </div>
  );
});

/**
 * Same as the base demo customizations but with the callout swapped out
 * for the preview-specific renderer. Forms, buttons, charts, etc. keep
 * the existing custom styling.
 */
export const previewCustomizations: MdmaCustomizations = {
  ...baseCustomizations,
  components: {
    ...baseCustomizations.components,
    callout: PreviewCalloutRenderer,
  },
};
