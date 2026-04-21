interface FixerSettingsProps {
  autoFixWithLlm: boolean;
  onAutoFixChange: (enabled: boolean) => void;
  fixerModel: string;
  onFixerModelChange: (model: string) => void;
  customFixerModel: string;
  onCustomFixerModelChange: (model: string) => void;
}

export function FixerSettings({
  autoFixWithLlm,
  onAutoFixChange,
  fixerModel,
  onFixerModelChange,
  customFixerModel,
  onCustomFixerModelChange,
}: FixerSettingsProps) {
  return (
    <div className="fixer-settings-panel">
      <h3>Fixer Settings</h3>
      <label className="fixer-settings-checkbox">
        <input
          type="checkbox"
          checked={autoFixWithLlm}
          onChange={(e) => onAutoFixChange(e.target.checked)}
        />
        <span>Fix automatically when issues detected</span>
      </label>
      <div className="fixer-settings-field">
        <span>Model</span>
        <select value={fixerModel} onChange={(e) => onFixerModelChange(e.target.value)}>
          <option value="">Same as chat</option>
          <optgroup label="OpenAI">
            <option value="gpt-5.4">gpt-5.4</option>
            <option value="gpt-5.4-mini">gpt-5.4-mini</option>
            <option value="gpt-5.4-nano">gpt-5.4-nano</option>
            <option value="gpt-5.3-codex">gpt-5.3-codex</option>
            <option value="o3">o3</option>
            <option value="o3-pro">o3-pro</option>
            <option value="o4-mini">o4-mini</option>
            <option value="gpt-4.1">gpt-4.1</option>
            <option value="gpt-4.1-mini">gpt-4.1-mini</option>
          </optgroup>
          <optgroup label="Anthropic">
            <option value="claude-opus-4-6">claude-opus-4.6</option>
            <option value="claude-sonnet-4-6">claude-sonnet-4.6</option>
            <option value="claude-haiku-4-5-20251001">claude-haiku-4.5</option>
            <option value="claude-sonnet-4-5-20250929">claude-sonnet-4.5</option>
          </optgroup>
          <optgroup label="Google">
            <option value="gemini-2.5-pro">gemini-2.5-pro</option>
            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
          </optgroup>
          <optgroup label="OpenRouter">
            <option value="openai/gpt-5.4">openai/gpt-5.4</option>
            <option value="openai/gpt-5.4-mini">openai/gpt-5.4-mini</option>
            <option value="anthropic/claude-opus-4-6">anthropic/claude-opus-4.6</option>
            <option value="anthropic/claude-sonnet-4-6">anthropic/claude-sonnet-4.6</option>
            <option value="google/gemini-2.5-pro">google/gemini-2.5-pro</option>
            <option value="google/gemini-2.5-flash">google/gemini-2.5-flash</option>
            <option value="meta-llama/llama-4-scout">meta-llama/llama-4-scout</option>
            <option value="deepseek/deepseek-r1">deepseek/deepseek-r1</option>
            <option value="qwen/qwen3-235b">qwen/qwen3-235b</option>
          </optgroup>
          <option value="__custom__">Custom model...</option>
        </select>
      </div>
      {fixerModel === '__custom__' && (
        <div className="fixer-settings-field">
          <span>Custom Model ID</span>
          <input
            type="text"
            value={customFixerModel}
            onChange={(e) => onCustomFixerModelChange(e.target.value)}
            placeholder="e.g. openrouter/auto"
          />
        </div>
      )}
    </div>
  );
}
