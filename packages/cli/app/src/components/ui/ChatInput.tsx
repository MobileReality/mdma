interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled: boolean;
  placeholder: string;
  sendLabel: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isGenerating,
  disabled,
  placeholder,
  sendLabel,
}: ChatInputProps) {
  return (
    <div className="flex gap-2 pt-2 border-t border-border-light">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isGenerating && !disabled) onSend();
          }
        }}
        placeholder={placeholder}
        rows={2}
        disabled={disabled}
        className={`
          flex-1 px-2.5 py-2 border border-border rounded-md bg-surface-2 text-text-primary text-sm
          outline-none resize-none font-[inherit] focus:border-primary focus:ring-1 focus:ring-primary/30
          ${disabled ? 'opacity-50' : ''}
        `}
      />
      {isGenerating ? (
        <button
          type="button"
          onClick={onStop}
          className="px-4 py-2 border border-error rounded-md bg-error/10 text-error text-sm font-semibold cursor-pointer self-end hover:bg-error/20 transition-colors"
        >
          Stop
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className={`
            px-4 py-2 border border-primary rounded-md bg-primary-light text-primary-text text-sm font-semibold cursor-pointer self-end
            hover:bg-primary hover:text-white transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {sendLabel}
        </button>
      )}
    </div>
  );
}
