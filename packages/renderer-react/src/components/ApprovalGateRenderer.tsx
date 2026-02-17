import { memo } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

export const ApprovalGateRenderer = memo(function ApprovalGateRenderer({ component, componentState, dispatch }: MdmaBlockRendererProps) {
  if (component.type !== 'approval-gate') return null;

  const status = componentState?.values.status as string ?? 'pending';

  return (
    <div
      className={`mdma-approval-gate mdma-approval-gate--${status}`}
      data-component-id={component.id}
    >
      <h3 className="mdma-approval-gate-title">{component.title}</h3>
      {component.description && (
        <p className="mdma-approval-gate-description">{component.description}</p>
      )}
      <div className="mdma-approval-gate-status">
        Status: <strong>{status}</strong>
      </div>
      {status === 'pending' && (
        <div className="mdma-approval-gate-actions">
          <button
            type="button"
            className="mdma-button mdma-button--primary"
            onClick={() =>
              dispatch({
                type: 'APPROVAL_GRANTED',
                componentId: component.id,
                actor: { id: 'current-user' },
              })
            }
          >
            Approve
          </button>
          <button
            type="button"
            className="mdma-button mdma-button--danger"
            onClick={() =>
              dispatch({
                type: 'APPROVAL_DENIED',
                componentId: component.id,
                actor: { id: 'current-user' },
                reason: '',
              })
            }
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
});
