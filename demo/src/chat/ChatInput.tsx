import { memo, type RefObject } from 'react';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onClear: () => void;
  isGenerating: boolean;
  hasMessages: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  /** When true, the input is disabled (e.g. flow completed). */
  disabled?: boolean;
  /** Placeholder text override. */
  placeholder?: string;
}

export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  onClear,
  isGenerating,
  hasMessages,
  inputRef,
  disabled,
  placeholder,
}: ChatInputProps) {
  const isDisabled = disabled && !isGenerating;

  return (
    <div className="chat-input-bar">
      {hasMessages && (
        <button
          type="button"
          className="chat-clear-btn"
          onClick={onClear}
          title="Clear chat history"
        >
          Clear
        </button>
      )}
      <textarea
        ref={inputRef}
        className="chat-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Describe the interactive document you need..."}
        rows={2}
        disabled={isDisabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isDisabled) onSend();
          }
        }}
      />
      {isGenerating ? (
        <button type="button" className="chat-stop-btn" onClick={onStop}>
          Stop
        </button>
      ) : (
        <button
          type="button"
          className="chat-send-btn"
          onClick={onSend}
          disabled={isDisabled || !value.trim()}
        >
          Send
        </button>
      )}
    </div>
  );
});
