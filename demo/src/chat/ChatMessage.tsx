import { memo, useState, useCallback } from 'react';
import { MdmaDocument, type MdmaRenderCustomizations } from '@mdma/renderer-react';
import type { ChatMsg } from './types.js';

export interface ChatMessageProps {
  message: ChatMsg;
  isStreaming: boolean;
  customizations?: MdmaRenderCustomizations;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming,
  customizations,
}: ChatMessageProps) {
  const [showSource, setShowSource] = useState(false);
  const toggleSource = useCallback(() => setShowSource((s) => !s), []);

  return (
    <div className={`chat-msg chat-msg--${message.role}`}>
      <div className="chat-msg-header">
        <span className="chat-msg-label">
          {message.role === 'user' ? 'You' : 'MDMA AI'}
        </span>
        {message.role === 'assistant' && message.content && (
          <button
            type="button"
            className={`chat-msg-view-toggle ${showSource ? 'chat-msg-view-toggle--active' : ''}`}
            onClick={toggleSource}
          >
            {showSource ? 'Rendered' : 'Source'}
          </button>
        )}
      </div>
      <div className="chat-msg-body">
        {message.role === 'user' ? (
          <p>{message.content}</p>
        ) : showSource && message.content ? (
          <pre className="chat-msg-source">{message.content}</pre>
        ) : message.ast && message.store ? (
          <>
            <MdmaDocument ast={message.ast} store={message.store} customizations={customizations} />
            {isStreaming && (
              <span className="chat-msg-streaming">Streaming...</span>
            )}
          </>
        ) : message.content ? (
          <div className="chat-msg-parsing">
            <span className="chat-msg-typing">Parsing document...</span>
            <pre className="chat-msg-raw">{message.content}</pre>
          </div>
        ) : (
          <span className="chat-msg-typing">Generating...</span>
        )}
      </div>
    </div>
  );
});
