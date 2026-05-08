import { memo, useState } from 'react';
import { AUTHOR_PROMPT_VARIANTS } from '@mobile-reality/mdma-prompt-pack';
import type { AnthropicConfig } from './anthropic-client.js';

const AGENT_MODELS = [
  { value: 'claude-opus-4-7', label: 'claude-opus-4.7' },
  { value: 'claude-opus-4-6', label: 'claude-opus-4.6' },
  { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4.6' },
];

export interface AgentSettingsProps {
  config: AnthropicConfig;
  onUpdate: (patch: Partial<AnthropicConfig>) => void;
}

export const AgentSettings = memo(function AgentSettings({ config, onUpdate }: AgentSettingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="chat-settings-bar">
      <button type="button" className="chat-settings-toggle" data-open={open ? 'true' : 'false'} onClick={() => setOpen((v) => !v)}>
        Agent Settings
      </button>
      {open && (
        <div className="chat-settings">
          <div className="chat-settings-fields">
            <label className="ai-setting">
              <span>Anthropic API Key</span>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => onUpdate({ apiKey: e.target.value })}
                placeholder="sk-ant-..."
              />
            </label>
            <div className="ai-setting">
              <span>Model</span>
              <select
                aria-label="Model"
                value={config.model}
                onChange={(e) => onUpdate({ model: e.target.value })}
              >
                {AGENT_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
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
            Agent mode uses the native Anthropic Messages API with extended thinking and tool use.
            Only Claude Sonnet / Opus 4.x models are supported.
          </p>
        </div>
      )}
    </div>
  );
});
