import { memo } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export const WebhookRenderer = memo(function WebhookRenderer({
  component,
  componentState,
}: MdmaBlockRendererProps) {
  if (component.type !== 'webhook') return null;

  const status = (componentState?.values.status as string) ?? 'idle';

  return (
    <div className="mdma-webhook" data-component-id={component.id}>
      {component.label && <span className="mdma-webhook-label">{component.label}</span>}
      <span className={`mdma-webhook-status mdma-webhook-status--${status}`}>
        Webhook: {status}
      </span>
    </div>
  );
});
