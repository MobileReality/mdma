import { memo, useState } from 'react';
import { AUTHOR_PROMPT_VARIANTS } from '@mobile-reality/mdma-prompt-pack';
import type { AnthropicConfig } from './anthropic-client.js';

const ANTHROPIC_MODELS = [
  { value: 'claude-opus-4-7', label: 'claude-opus-4.7' },
  { value: 'claude-opus-4-6', label: 'claude-opus-4.6' },
  { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4.6' },
];

const OPENAI_MODELS = [
  { value: 'gpt-5.5', label: 'gpt-5.5' },
  { value: 'gpt-5.5-pro', label: 'gpt-5.5-pro' },
  { value: 'gpt-5.4', label: 'gpt-5.4' },
  { value: 'gpt-5.4-mini', label: 'gpt-5.4-mini' },
  { value: 'o3', label: 'o3' },
  { value: 'o4-mini', label: 'o4-mini' },
];

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5.5',
};

export interface AgentSettingsProps {
  config: AnthropicConfig;
  onUpdate: (patch: Partial<AnthropicConfig>) => void;
}

export const AgentSettings = memo(function AgentSettings({ config, onUpdate }: AgentSettingsProps) {
  const [open, setOpen] = useState(false);

  const provider = config.provider ?? 'anthropic';
  const models = provider === 'openai' ? OPENAI_MODELS : ANTHROPIC_MODELS;

  function switchProvider(next: 'anthropic' | 'openai') {
    if (next === provider) return;
    onUpdate({ provider: next, model: DEFAULT_MODELS[next] });
  }

  return (
    <div className="chat-settings-bar">
      <button
        type="button"
        className="chat-settings-toggle"
        data-open={open ? 'true' : 'false'}
        onClick={() => setOpen((v) => !v)}
      >
        Agent Settings
      </button>
      {open && (
        <div className="chat-settings">
          <div className="ai-settings-presets">
            {(['anthropic', 'openai'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`ai-preset-btn ${provider === p ? 'ai-preset-btn--active' : ''}`}
                onClick={() => switchProvider(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="chat-settings-fields">
            <label className="ai-setting">
              <span>{provider === 'openai' ? 'OpenAI API Key' : 'Anthropic API Key'}</span>
              <input
                type="password"
                value={provider === 'openai' ? (config.openaiApiKey ?? '') : config.apiKey}
                onChange={(e) =>
                  provider === 'openai'
                    ? onUpdate({ openaiApiKey: e.target.value })
                    : onUpdate({ apiKey: e.target.value })
                }
                placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              />
            </label>
            <div className="ai-setting">
              <span>Model</span>
              <select
                aria-label="Model"
                value={config.model}
                onChange={(e) => onUpdate({ model: e.target.value })}
              >
                {models.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {provider === 'anthropic' && (
              <label className="ai-setting">
                <span>Thinking budget (tokens)</span>
                <input
                  type="number"
                  min={1024}
                  max={32000}
                  step={1024}
                  value={config.thinkingBudget ?? 8000}
                  onChange={(e) => onUpdate({ thinkingBudget: Number(e.target.value) })}
                />
              </label>
            )}
            <label className="ai-setting">
              <span>System prompt variant</span>
              <select
                aria-label="System prompt variant"
                value={config.systemPromptId ?? AUTHOR_PROMPT_VARIANTS[0].id}
                onChange={(e) => onUpdate({ systemPromptId: e.target.value })}
                title={
                  AUTHOR_PROMPT_VARIANTS.find(
                    (v) => v.id === (config.systemPromptId ?? AUTHOR_PROMPT_VARIANTS[0].id),
                  )?.description
                }
              >
                {AUTHOR_PROMPT_VARIANTS.map((v) => (
                  <option key={v.id} value={v.id} title={v.description}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="agent-settings-note">
            {provider === 'anthropic'
              ? 'Anthropic mode uses extended thinking (Claude 4.x only). Reasoning is visible during generation.'
              : 'OpenAI mode uses Chat Completions with function calling. Reasoning is internal and not displayed.'}
          </p>
        </div>
      )}
    </div>
  );
});
