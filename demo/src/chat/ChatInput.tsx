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
  /** Copy the whole raw conversation to the clipboard (debugging). */
  onCopyRaw?: () => void;
  /** Briefly true right after a successful copy, for button feedback. */
  copiedRaw?: boolean;
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
  onCopyRaw,
  copiedRaw,
}: ChatInputProps) {
  const isDisabled = disabled && !isGenerating;

  return (
    <div className="chat-input-bar">
      <div className="chat-input-container">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Describe the interactive document you need…'}
          rows={2}
          disabled={isDisabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!isDisabled) onSend();
            }
          }}
        />
        <div className="chat-input-actions">
          {hasMessages && onCopyRaw && (
            <button
              type="button"
              className="chat-clear-btn"
              onClick={onCopyRaw}
              title="Copy the whole raw conversation (text + generate_mdma documents) for debugging"
            >
              {copiedRaw ? 'Copied!' : 'Copy raw'}
            </button>
          )}
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
          <span className="chat-input-hint">Enter to send · Shift+Enter for newline</span>
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
      </div>
    </div>
  );
});
