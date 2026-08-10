import { type FormEvent, useState } from 'react';

export interface ChatInputProps {
  isStreaming: boolean;
  onSend(text: string): void;
  onStop(): void;
}

export function ChatInput({ isStreaming, onSend, onStop }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isStreaming || !text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <input
        className="composer__input"
        value={text}
        placeholder="Ask for something with a UI…"
        onChange={(event) => setText(event.target.value)}
        disabled={isStreaming}
      />
      {isStreaming ? (
        <button type="button" className="composer__button" onClick={onStop}>
          Stop
        </button>
      ) : (
        <button type="submit" className="composer__button" disabled={!text.trim()}>
          Send
        </button>
      )}
    </form>
  );
}
