import { memo, useState } from 'react';
import { PROVIDER_PRESETS, type LlmConfig } from '../llm-client.js';

const MODEL_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  openai: [
    { value: 'gpt-5.4', label: 'gpt-5.4' },
    { value: 'gpt-5.4-mini', label: 'gpt-5.4-mini' },
    { value: 'gpt-5.4-nano', label: 'gpt-5.4-nano' },
    { value: 'gpt-5.3-codex', label: 'gpt-5.3-codex' },
    { value: 'gpt-5-mini', label: 'gpt-5-mini' },
    { value: 'o3', label: 'o3' },
    { value: 'o3-pro', label: 'o3-pro' },
    { value: 'o4-mini', label: 'o4-mini' },
    { value: 'gpt-4.1', label: 'gpt-4.1' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
  ],
  anthropic: [
    { value: 'claude-opus-4-6', label: 'claude-opus-4.6' },
    { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4.6' },
    { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4.5' },
    { value: 'claude-sonnet-4-5-20250929', label: 'claude-sonnet-4.5' },
  ],
  gemini: [
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
  ],
  openrouter: [
    { value: 'openai/gpt-5.4', label: 'openai/gpt-5.4' },
    { value: 'openai/gpt-5.4-mini', label: 'openai/gpt-5.4-mini' },
    { value: 'anthropic/claude-opus-4-6', label: 'anthropic/claude-opus-4.6' },
    { value: 'anthropic/claude-sonnet-4-6', label: 'anthropic/claude-sonnet-4.6' },
    { value: 'google/gemini-2.5-pro', label: 'google/gemini-2.5-pro' },
    { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash' },
    { value: 'meta-llama/llama-4-scout', label: 'meta-llama/llama-4-scout' },
    { value: 'deepseek/deepseek-r1', label: 'deepseek/deepseek-r1' },
    { value: 'qwen/qwen3-235b', label: 'qwen/qwen3-235b' },
  ],
};

function detectProvider(baseUrl: string): string | null {
  for (const [name, preset] of Object.entries(PROVIDER_PRESETS)) {
    if (baseUrl === preset.baseUrl) return name;
  }
  return null;
}

export interface ChatSettingsProps {
  config: LlmConfig;
  onUpdate: (patch: Partial<LlmConfig>) => void;
  onPreset: (name: string) => void;
}

export const ChatSettings = memo(function ChatSettings({
  config,
  onUpdate,
  onPreset,
}: ChatSettingsProps) {
  const [open, setOpen] = useState(false);

  const provider = detectProvider(config.baseUrl);
  const models = provider ? MODEL_OPTIONS[provider] : null;
  const isKnownModel = models?.some((m) => m.value === config.model);
  const isCustom = !models || !isKnownModel;

  return (
    <div className="chat-settings-bar">
      <button type="button" className="chat-settings-toggle" onClick={() => setOpen(!open)}>
        {open ? 'Hide Settings' : 'LLM Settings'}
      </button>
      {open && (
        <div className="chat-settings">
          <div className="ai-settings-presets">
            {Object.keys(PROVIDER_PRESETS).map((name) => (
              <button
                key={name}
                type="button"
                className={`ai-preset-btn ${config.baseUrl === PROVIDER_PRESETS[name].baseUrl ? 'ai-preset-btn--active' : ''}`}
                onClick={() => onPreset(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="chat-settings-fields">
            <label className="ai-setting">
              <span>API Base URL</span>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => onUpdate({ baseUrl: e.target.value })}
              />
            </label>
            <label className="ai-setting">
              <span>API Key</span>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => onUpdate({ apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </label>
            <div className="ai-setting">
              <span>Model</span>
              {models ? (
                <div className="ai-setting-model-group">
                  <select
                    aria-label="Model"
                    value={isCustom ? '__custom__' : config.model}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        onUpdate({ model: '' });
                      } else {
                        onUpdate({ model: e.target.value });
                      }
                    }}
                  >
                    {models.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                    <option value="__custom__">Custom...</option>
                  </select>
                  {isCustom && (
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => onUpdate({ model: e.target.value })}
                      placeholder="Enter model ID..."
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => onUpdate({ model: e.target.value })}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
