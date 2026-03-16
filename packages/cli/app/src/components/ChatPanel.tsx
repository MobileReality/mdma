import { useState, useMemo } from 'react';
import { LlmSettingsPanel } from './LlmSettingsPanel.js';
import { ChatInput } from './ui/ChatInput.js';
import { PROVIDER_PRESETS } from '../lib/llm-client.js';
import { loadApiKeys, saveApiKey, detectProvider } from '../lib/api-keys.js';
import type { ChatMessage, LlmConfig } from '../lib/llm-client.js';

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  error: string | null;
  onGenerate: (message?: string) => void;
  onStop: () => void;
  onReset: () => void;
  config: LlmConfig;
  onConfigChange: (config: LlmConfig) => void;
}

export function ChatPanel({
  messages,
  isGenerating,
  error,
  onGenerate,
  onStop,
  onReset,
  config,
  onConfigChange,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const activeProvider = useMemo(() => detectProvider(config.baseUrl), [config.baseUrl]);
  const activePreset = activeProvider ? PROVIDER_PRESETS[activeProvider] : null;

  const handleConfigChange = (newConfig: LlmConfig) => {
    const provider = detectProvider(newConfig.baseUrl);
    if (provider) {
      const savedKeys = loadApiKeys();
      const resolvedKey = newConfig.apiKey !== config.apiKey ? newConfig.apiKey : (savedKeys[provider] || newConfig.apiKey);
      if (newConfig.apiKey !== config.apiKey) saveApiKey(provider, newConfig.apiKey);
      onConfigChange({ ...newConfig, apiKey: resolvedKey });
    } else {
      onConfigChange(newConfig);
    }
  };

  const hasKey = !activePreset?.requiresKey || config.apiKey.length > 0;

  const send = () => {
    const msg = input.trim();
    setInput('');
    onGenerate(msg || undefined);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex gap-2 items-center py-2">
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          className="border-none bg-transparent text-primary cursor-pointer text-xs p-0 hover:text-primary-hover"
        >
          {showSettings ? 'Hide Settings' : 'Settings'}
        </button>
        <span className="text-[11px] text-text-muted">
          {activePreset?.label || 'Custom'} / {config.model}
        </span>
        {!hasKey && <span className="text-[11px] text-warning">API key required</span>}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onReset}
          className="border-none bg-transparent text-primary cursor-pointer text-xs p-0 hover:text-primary-hover"
        >
          Clear
        </button>
      </div>

      {showSettings && (
        <LlmSettingsPanel
          config={config}
          onConfigChange={handleConfigChange}
          activeProvider={activeProvider}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 py-1">
        {messages.length === 0 && !isGenerating && (
          <div className="text-text-muted text-sm text-center py-10 px-5">
            {hasKey ? (
              <>Configure components on the left, then click <strong>Generate</strong>.</>
            ) : (
              <>Set your <strong>{activePreset?.label || 'LLM'}</strong> API key in Settings above to get started.</>
            )}
          </div>
        )}
        {messages.filter((m) => m.role !== 'system').map((msg, i) => (
          <div
            key={i}
            className={`
              px-3 py-2 rounded-lg text-sm leading-relaxed max-w-[90%] whitespace-pre-wrap
              ${msg.role === 'user'
                ? 'bg-primary-light text-primary-text self-end'
                : 'bg-surface-2 text-text-primary self-start'
              }
            `}
          >
            {msg.content}
          </div>
        ))}
        {isGenerating && <div className="text-xs text-primary px-1">Generating...</div>}
        {error && <div className="text-xs text-error px-1">{error}</div>}
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={send}
        onStop={onStop}
        isGenerating={isGenerating}
        disabled={!hasKey}
        placeholder={messages.length === 0 ? 'Click Generate or type to refine...' : 'Refine the prompt...'}
        sendLabel={messages.length === 0 ? 'Generate' : 'Send'}
      />
    </div>
  );
}
