import { memo, useRef, useEffect } from 'react';
import type { StoreAction } from '@mobile-reality/mdma-spec';
import type { ChatActionEntry } from './use-chat-action-log.js';

export interface ChatActionLogProps {
  events: ChatActionEntry[];
  isOpen: boolean;
  onToggle: () => void;
}

function renderDetail(action: StoreAction) {
  if ('field' in action) {
    return (
      <span className="demo-event-detail">
        .{action.field} = {JSON.stringify((action as { value: unknown }).value)}
      </span>
    );
  }
  if ('actionId' in action) {
    return (
      <span className="demo-event-detail">action: {(action as { actionId: string }).actionId}</span>
    );
  }
  return null;
}

export const ChatActionLog = memo(function ChatActionLog({
  events,
  isOpen,
  onToggle,
}: ChatActionLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <>
      <button
        type="button"
        className="chat-action-log-toggle"
        onClick={onToggle}
        title={isOpen ? 'Hide action log' : 'Show action log'}
      >
        {isOpen ? 'Hide Log' : 'Action Log'}
        {events.length > 0 && <span className="chat-action-log-badge">{events.length}</span>}
      </button>

      {isOpen && (
        <div className="chat-action-log-panel">
          <h2 className="chat-action-log-title">Action Log</h2>
          <div className="chat-action-log-list" ref={logRef}>
            {events.length === 0 && (
              <p className="chat-action-log-empty">
                Interact with rendered documents to see events here.
              </p>
            )}
            {events.map((entry) => (
              <div key={entry.id} className="chat-action-log-entry">
                <span className="demo-event-time">{entry.timestamp}</span>
                <span className="chat-action-log-msg-id">msg#{entry.messageId}</span>
                <span className={`demo-event-type demo-event-type--${entry.action.type}`}>
                  {entry.action.type}
                </span>
                <span className="demo-event-component">{entry.action.componentId}</span>
                {renderDetail(entry.action)}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
});
