import { PROVIDER_PRESETS } from '../lib/llm-client.js';
import type { LlmConfig } from '../lib/llm-client.js';

interface LlmSettingsPanelProps {
  config: LlmConfig;
  onConfigChange: (config: LlmConfig) => void;
  activeProvider: string | null;
}

export function LlmSettingsPanel({
  config,
  onConfigChange,
  activeProvider,
}: LlmSettingsPanelProps) {
  const activePreset = activeProvider ? PROVIDER_PRESETS[activeProvider] : null;

  return (
    <div className="p-3 border border-border rounded-lg bg-surface-1 mb-2 flex flex-col gap-2.5">
      <span className="text-xs text-text-secondary font-medium">Provider</span>
      <div className="flex gap-1.5 flex-wrap">
        {Object.entries(PROVIDER_PRESETS).map(([name, preset]) => (
          <button
            key={name}
            type="button"
            onClick={() =>
              onConfigChange({
                baseUrl: preset.baseUrl,
                model: preset.model,
                apiKey: config.apiKey,
              })
            }
            className={`
              px-3 py-1.5 border rounded text-xs font-medium cursor-pointer transition-colors
              ${
                activeProvider === name
                  ? 'border-primary text-primary-text bg-primary-light'
                  : 'border-border text-text-secondary bg-surface-2 hover:bg-surface-3'
              }
            `}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {activePreset?.requiresKey && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-text-secondary">{activePreset.label} API Key</span>
          <input
            placeholder={`Enter your ${activePreset.label} API key...`}
            type="password"
            value={config.apiKey}
            onChange={(e) => onConfigChange({ ...config, apiKey: e.target.value })}
            className={`
              px-2 py-1.5 border rounded bg-surface-2 text-text-primary text-xs outline-none focus:ring-1 focus:ring-primary/30
              ${config.apiKey ? 'border-success/30' : 'border-warning/30'}
            `}
          />
          {config.apiKey && (
            <span className="text-[10px] text-success">Key saved for {activePreset.label}</span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-[11px] text-text-secondary">Model</span>
          <input
            placeholder="Model"
            value={config.model}
            onChange={(e) => onConfigChange({ ...config, model: e.target.value })}
            className="px-2 py-1.5 border border-border rounded bg-surface-2 text-text-primary text-xs outline-none focus:border-primary"
          />
        </div>
        <div className="flex-[2] flex flex-col gap-1">
          <span className="text-[11px] text-text-secondary">Base URL</span>
          <input
            placeholder="Base URL"
            value={config.baseUrl}
            onChange={(e) => onConfigChange({ ...config, baseUrl: e.target.value })}
            className="px-2 py-1.5 border border-border rounded bg-surface-2 text-text-primary text-xs outline-none focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}
