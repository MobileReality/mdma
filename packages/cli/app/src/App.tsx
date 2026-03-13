import { useState } from 'react';
import { DomainForm } from './components/DomainForm.js';
import { ComponentPicker } from './components/ComponentPicker.js';
import { ComponentConfigurator } from './components/ComponentConfigurator.js';
import { ChatPanel } from './components/ChatPanel.js';
import { PromptOutput } from './components/PromptOutput.js';
import { PreviewTab } from './components/PreviewTab.js';
import { usePromptBuilder } from './hooks/use-prompt-builder.js';
import { DEFAULT_CONFIG } from './lib/llm-client.js';
import { pickRandomPreset } from './lib/sample-presets.js';
import type { LlmConfig } from './lib/llm-client.js';

export function App() {
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(() => {
    const saved = localStorage.getItem('mdma-builder-llm-config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const handleConfigChange = (config: LlmConfig) => {
    setLlmConfig(config);
    localStorage.setItem('mdma-builder-llm-config', JSON.stringify(config));
  };

  const {
    domain,
    setDomain,
    components,
    setComponents,
    toggleComponent,
    updateComponent,
    messages,
    generatedPrompt,
    isGenerating,
    error,
    generate,
    stop,
    reset,
  } = usePromptBuilder(llmConfig);

  const [activeTab, setActiveTab] = useState<'chat' | 'output' | 'preview'>('chat');

  const handleSample = () => {
    const preset = pickRandomPreset();
    setDomain(preset.domain);
    setComponents(preset.components);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0a0a0a',
      color: '#e0e0e0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        borderBottom: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
          <span style={{ color: '#6366f1' }}>MDMA</span> Prompt Builder
        </h1>
        <span style={{ fontSize: '12px', color: '#666' }}>
          Generate custom prompts for your MDMA-powered chat
        </span>
      </header>

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar — Configuration */}
        <aside style={{
          width: '340px',
          borderRight: '1px solid #222',
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          flexShrink: 0,
        }}>
          <DomainForm domain={domain} onChange={setDomain} onSample={handleSample} />
          <ComponentPicker components={components} onToggle={toggleComponent} />
          <ComponentConfigurator components={components} onUpdate={updateComponent} />
        </aside>

        {/* Right — Chat + Output + Preview */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #222', padding: '0 16px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              style={{
                ...tabStyle,
                ...(activeTab === 'chat' ? activeTabStyle : {}),
              }}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('output')}
              style={{
                ...tabStyle,
                ...(activeTab === 'output' ? activeTabStyle : {}),
              }}
            >
              Output
              {generatedPrompt && (
                <span style={{
                  marginLeft: '6px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'inline-block',
                }} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              style={{
                ...tabStyle,
                ...(activeTab === 'preview' ? activeTabStyle : {}),
              }}
            >
              Preview
              {generatedPrompt && (
                <span style={{
                  marginLeft: '6px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  display: 'inline-block',
                }} />
              )}
            </button>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, padding: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'chat' ? (
              <ChatPanel
                messages={messages}
                isGenerating={isGenerating}
                error={error}
                onGenerate={generate}
                onStop={stop}
                onReset={reset}
                config={llmConfig}
                onConfigChange={handleConfigChange}
              />
            ) : activeTab === 'output' ? (
              <PromptOutput prompt={generatedPrompt} isGenerating={isGenerating} />
            ) : (
              <PreviewTab customPrompt={generatedPrompt} llmConfig={llmConfig} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const tabStyle: React.CSSProperties = {
  padding: '10px 16px',
  border: 'none',
  borderBottom: '2px solid transparent',
  background: 'none',
  color: '#888',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
};

const activeTabStyle: React.CSSProperties = {
  color: '#e0e0e0',
  borderBottomColor: '#6366f1',
};
