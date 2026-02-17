import { memo, useState } from 'react';
import { PROVIDER_PRESETS, type LlmConfig } from '../llm-client.js';

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

  return (
    <div className="chat-settings-bar">
      <button
        type="button"
        className="chat-settings-toggle"
        onClick={() => setOpen(!open)}
      >
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
            <label className="ai-setting">
              <span>Model</span>
              <input
                type="text"
                value={config.model}
                onChange={(e) => onUpdate({ model: e.target.value })}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
});
