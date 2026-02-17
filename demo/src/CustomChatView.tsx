import { ChatView } from './ChatView.js';
import { customSchemas, customRenderers } from './custom-components.js';

export function CustomChatView() {
  return (
    <div className="custom-chat-wrapper">
      <div className="custom-chat-info">
        <strong>Custom Components Mode</strong>
        <span>
          New types: <code>progress</code>, <code>rating</code>, <code>metric</code>.
          Restyled built-ins: <code>form</code>, <code>button</code>, <code>table</code>, <code>callout</code>.
        </span>
      </div>
      <ChatView
        renderers={customRenderers}
        parserOptions={{ customSchemas }}
      />
    </div>
  );
}
