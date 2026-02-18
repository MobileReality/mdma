import { ChatView } from './ChatView.js';
import { customizations } from './custom-components.js';

export function CustomChatView() {
  return (
    <div className="custom-chat-wrapper">
      <div className="custom-chat-info">
        <strong>Custom Components Mode</strong>
        <span>
          New types: <code>progress</code>, <code>rating</code>, <code>metric</code>.
          Restyled built-ins: <code>button</code>, <code>table</code>, <code>callout</code>.
          Form elements: glass inputs, toggle switches, gradient submit.
        </span>
      </div>
      <ChatView customizations={customizations} editable />
    </div>
  );
}
