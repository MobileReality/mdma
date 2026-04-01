import { ChatView } from './ChatView.js';
import { customizations } from './custom-components.js';

const PLAYGROUND_PROMPT = `You are a helpful AI assistant. You can discuss any topic freely.`;

export function PlaygroundView() {
  return (
    <div className="playground-wrapper">
      <div className="playground-info">
        <strong>Playground</strong>
        <span>
          Free-form chat. The AI knows MDMA basics and will generate interactive components when you
          ask for them.
        </span>
      </div>
      <ChatView
        customizations={customizations}
        systemPrompt={PLAYGROUND_PROMPT}
        userSuffix={null}
        storageKey="playground"
      />
    </div>
  );
}
