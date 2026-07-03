import { memo, useState } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export const WebhookRenderer = memo(function WebhookRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  const [triggered, setTriggered] = useState(false);
  if (component.type !== 'webhook') return null;

  const status = (componentState?.values.status as string) ?? 'idle';

  return (
    <div className="mdma-webhook" data-component-id={component.id}>
      {component.label && <span className="mdma-webhook-label">{component.label}</span>}
      <span className={`mdma-webhook-status mdma-webhook-status--${status}`}>
        Webhook: {triggered ? 'triggered' : status}
      </span>
      {!triggered && status === 'idle' && (
        <button
          type="button"
          className="mdma-webhook-trigger"
          onClick={() => {
            setTriggered(true);
            // Signals the user fired the webhook. Real HTTP execution is the (unbuilt) webhook
            // engine; this routes the trigger + request shape so an agent/host can act on it.
            dispatch({
              type: 'INTEGRATION_CALLED',
              componentId: component.id,
              integrationId: 'webhook',
              result: { status: 'triggered', url: component.url, method: component.method },
            });
          }}
        >
          Trigger webhook
        </button>
      )}
    </div>
  );
});
