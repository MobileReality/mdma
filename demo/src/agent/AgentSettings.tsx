import { memo, useState } from 'react';
import { AUTHOR_PROMPT_VARIANTS } from '@mobile-reality/mdma-prompt-pack';
import { getDefaultPromptVariantForModel } from '../model-prompt-variant.js';
import type { AnthropicConfig } from './anthropic-client.js';

const PROVIDER_MODELS: Record<string, Array<{ value: string; label: string }>> = {
  anthropic: [
    { value: 'claude-opus-4-7', label: 'claude-opus-4.7' },
    { value: 'claude-opus-4-6', label: 'claude-opus-4.6' },
    { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4.6' },
    { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4.5' },
  ],
  openai: [
    { value: 'gpt-5.5', label: 'gpt-5.5' },
    { value: 'gpt-5.5-pro', label: 'gpt-5.5-pro' },
    { value: 'gpt-5', label: 'gpt-5' },
    { value: 'gpt-5.4', label: 'gpt-5.4' },
    { value: 'gpt-5.4-mini', label: 'gpt-5.4-mini' },
    { value: 'gpt-5.4-nano', label: 'gpt-5.4-nano' },
    { value: 'gpt-5.2', label: 'gpt-5.2' },
    { value: 'gpt-5.1', label: 'gpt-5.1' },
    { value: 'gpt-5-mini', label: 'gpt-5-mini' },
    { value: 'o3', label: 'o3' },
    { value: 'o4-mini', label: 'o4-mini' },
    { value: 'gpt-4.1', label: 'gpt-4.1' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
  ],
  openrouter: [
    { value: 'google/gemini-3.1-pro-preview', label: 'google/gemini-3.1-pro-preview' },
    {
      value: 'google/gemini-3.1-flash-lite-preview',
      label: 'google/gemini-3.1-flash-lite-preview',
    },
    { value: 'google/gemini-3-flash-preview', label: 'google/gemini-3-flash-preview' },
    { value: 'google/gemini-2.5-pro', label: 'google/gemini-2.5-pro' },
    { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash' },
    { value: 'google/gemini-2.5-flash-lite', label: 'google/gemini-2.5-flash-lite' },
    { value: 'x-ai/grok-4.20', label: 'x-ai/grok-4.20' },
    { value: 'x-ai/grok-4.3', label: 'x-ai/grok-4.3' },
  ],
  'own-model': [{ value: 'mdma-26b', label: 'mdma-26b (our model)' }],
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'anthropic',
  openai: 'openai',
  openrouter: 'openrouter',
  'own-model': 'own model',
};

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5.5',
  openrouter: 'google/gemini-3.1-pro-preview',
  'own-model': 'mdma-26b',
};

const API_KEY_LABELS: Record<string, string> = {
  anthropic: 'Anthropic API Key',
  openai: 'OpenAI API Key',
  openrouter: 'OpenRouter API Key',
};

const API_KEY_PLACEHOLDERS: Record<string, string> = {
  anthropic: 'sk-ant-...',
  openai: 'sk-...',
  openrouter: 'sk-or-...',
};

function getApiKey(config: AnthropicConfig, provider: string): string {
  if (provider === 'openai') return config.openaiApiKey ?? '';
  if (provider === 'openrouter') return config.openrouterApiKey ?? '';
  return config.apiKey;
}

function apiKeyPatch(provider: string, value: string): Partial<AnthropicConfig> {
  if (provider === 'openai') return { openaiApiKey: value };
  if (provider === 'openrouter') return { openrouterApiKey: value };
  return { apiKey: value };
}

export interface AgentSettingsProps {
  config: AnthropicConfig;
  onUpdate: (patch: Partial<AnthropicConfig>) => void;
}

export const AgentSettings = memo(function AgentSettings({ config, onUpdate }: AgentSettingsProps) {
  const [open, setOpen] = useState(false);

  const provider = config.provider ?? 'anthropic';
  const models = PROVIDER_MODELS[provider] ?? [];
  // Our own endpoint has auth off, so it never needs a key.
  const needsKey = provider !== 'own-model';
  const missingKey = needsKey && !getApiKey(config, provider);

  function switchProvider(next: NonNullable<AnthropicConfig['provider']>) {
    if (next === provider) return;
    const defaultModel = DEFAULT_MODELS[next];
    onUpdate({
      provider: next,
      model: defaultModel,
      systemPromptId: getDefaultPromptVariantForModel(defaultModel),
    });
  }

  return (
    <div className="chat-settings-bar">
      <button
        type="button"
        className="chat-settings-toggle"
        data-open={open ? 'true' : 'false'}
        data-alert={missingKey ? 'true' : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        Agent Settings
        {missingKey && <span className="settings-missing-key">API key required</span>}
      </button>
      {open && (
        <div className="chat-settings">
          <div className="ai-settings-presets">
            {(Object.keys(PROVIDER_MODELS) as NonNullable<AnthropicConfig['provider']>[]).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  className={`ai-preset-btn ${provider === p ? 'ai-preset-btn--active' : ''}`}
                  onClick={() => switchProvider(p)}
                >
                  {PROVIDER_LABELS[p] ?? p}
                </button>
              ),
            )}
          </div>
          <div className="chat-settings-fields">
            {needsKey ? (
              <label className="ai-setting">
                <span>{API_KEY_LABELS[provider]}</span>
                <input
                  type="password"
                  value={getApiKey(config, provider)}
                  onChange={(e) => onUpdate(apiKeyPatch(provider, e.target.value))}
                  placeholder={API_KEY_PLACEHOLDERS[provider]}
                />
              </label>
            ) : (
              <div className="ai-setting">
                <span>Endpoint</span>
                <input type="text" value="mdma-26b · self-hosted (no key)" readOnly disabled />
              </div>
            )}
            <div className="ai-setting">
              <span>Model</span>
              <select
                aria-label="Model"
                value={config.model}
                onChange={(e) =>
                  onUpdate({
                    model: e.target.value,
                    systemPromptId: getDefaultPromptVariantForModel(e.target.value),
                  })
                }
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
          {provider === 'own-model' && (
            <p className="agent-settings-note">
              The entire agent runs on our self-hosted <strong>mdma-26b</strong> endpoint
              (tool-calling enabled) — no third-party model is called. First message after idle can
              take ~6–10&nbsp;min (cold start).
            </p>
          )}
          <p className="agent-settings-note agent-settings-note--storage">
            🔒 Your API key is stored in your browser&apos;s localStorage only. It is never sent to
            any server other than the AI provider you select.
          </p>
        </div>
      )}
    </div>
  );
});
