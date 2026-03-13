import { useState, useMemo } from 'react';
import type { ChatMessage, LlmConfig } from '../lib/llm-client.js';
import { PROVIDER_PRESETS } from '../lib/llm-client.js';

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

const STORAGE_KEY = 'mdma-builder-api-keys';

function loadApiKeys(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveApiKey(provider: string, key: string) {
  const keys = loadApiKeys();
  keys[provider] = key;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

function detectProvider(baseUrl: string): string | null {
  for (const [name, preset] of Object.entries(PROVIDER_PRESETS)) {
    if (baseUrl === preset.baseUrl) return name;
  }
  return null;
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

  const handleProviderSwitch = (name: string) => {
    const preset = PROVIDER_PRESETS[name];
    const savedKeys = loadApiKeys();
    onConfigChange({
      baseUrl: preset.baseUrl,
      model: preset.model,
      apiKey: savedKeys[name] || '',
    });
  };

  const handleApiKeyChange = (key: string) => {
    onConfigChange({ ...config, apiKey: key });
    if (activeProvider) {
      saveApiKey(activeProvider, key);
    }
  };

  const send = () => {
    const msg = input.trim();
    setInput('');
    onGenerate(msg || undefined);
  };

  const hasKey = !activePreset?.requiresKey || config.apiKey.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 0' }}>
        <button onClick={() => setShowSettings((s) => !s)} style={linkBtnStyle}>
          {showSettings ? 'Hide Settings' : 'Settings'}
        </button>
        <span style={{ fontSize: '11px', color: '#666' }}>
          {activePreset?.label || 'Custom'} / {config.model}
        </span>
        {!hasKey && (
          <span style={{ fontSize: '11px', color: '#f59e0b' }}>API key required</span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onReset} style={linkBtnStyle}>Clear</button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div style={{ padding: '12px', border: '1px solid #333', borderRadius: '8px', background: '#111', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>Provider</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.entries(PROVIDER_PRESETS).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => handleProviderSwitch(name)}
                style={{
                  ...presetBtnStyle,
                  ...(activeProvider === name
                    ? { borderColor: '#6366f1', color: '#a5b4fc', background: '#1e1b4b' }
                    : {}),
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {activePreset?.requiresKey && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888' }}>
                {activePreset.label} API Key
              </span>
              <input
                placeholder={`Enter your ${activePreset.label} API key...`}
                type="password"
                value={config.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                style={{
                  ...settingsInputStyle,
                  borderColor: config.apiKey ? '#22c55e33' : '#f59e0b33',
                }}
              />
              {config.apiKey && (
                <span style={{ fontSize: '10px', color: '#22c55e' }}>
                  Key saved for {activePreset.label}
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888' }}>Model</span>
              <input
                placeholder="Model"
                value={config.model}
                onChange={(e) => onConfigChange({ ...config, model: e.target.value })}
                style={settingsInputStyle}
              />
            </div>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888' }}>Base URL</span>
              <input
                placeholder="Base URL"
                value={config.baseUrl}
                onChange={(e) => onConfigChange({ ...config, baseUrl: e.target.value })}
                style={settingsInputStyle}
              />
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
        {messages.length === 0 && !isGenerating && (
          <div style={{ color: '#555', fontSize: '13px', textAlign: 'center', padding: '40px 20px' }}>
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
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: 1.5,
              background: msg.role === 'user' ? '#1e1b4b' : '#1a1a1a',
              color: msg.role === 'user' ? '#c7d2fe' : '#e0e0e0',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              whiteSpace: 'pre-wrap',
            }}
          >
            {msg.content}
          </div>
        ))}
        {isGenerating && (
          <div style={{ fontSize: '12px', color: '#6366f1', padding: '4px' }}>Generating...</div>
        )}
        {error && (
          <div style={{ fontSize: '12px', color: '#ef4444', padding: '4px' }}>{error}</div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #222' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!isGenerating && hasKey) send();
            }
          }}
          placeholder={messages.length === 0 ? 'Click Generate or type to refine...' : 'Refine the prompt...'}
          rows={2}
          disabled={!hasKey}
          style={{
            flex: 1,
            padding: '8px 10px',
            border: '1px solid #333',
            borderRadius: '6px',
            background: '#1a1a1a',
            color: '#e0e0e0',
            fontSize: '13px',
            fontFamily: 'inherit',
            resize: 'none',
            outline: 'none',
            opacity: hasKey ? 1 : 0.5,
          }}
        />
        {isGenerating ? (
          <button onClick={onStop} style={{ ...actionBtnStyle, background: '#7f1d1d', borderColor: '#ef4444' }}>
            Stop
          </button>
        ) : (
          <button type="button" onClick={send} disabled={!hasKey} style={{ ...actionBtnStyle, opacity: hasKey ? 1 : 0.5 }}>
            {messages.length === 0 ? 'Generate' : 'Send'}
          </button>
        )}
      </div>
    </div>
  );
}

const linkBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'none',
  color: '#6366f1',
  cursor: 'pointer',
  fontSize: '12px',
  padding: 0,
};

const presetBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #333',
  borderRadius: '4px',
  background: '#1a1a1a',
  color: '#888',
  fontSize: '12px',
  cursor: 'pointer',
  fontWeight: 500,
};

const settingsInputStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid #333',
  borderRadius: '4px',
  background: '#1a1a1a',
  color: '#e0e0e0',
  fontSize: '12px',
  outline: 'none',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #6366f1',
  borderRadius: '6px',
  background: '#1e1b4b',
  color: '#a5b4fc',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  alignSelf: 'flex-end',
};
