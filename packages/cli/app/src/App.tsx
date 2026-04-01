import { useState, useMemo } from 'react';
import { DomainForm } from './components/DomainForm.js';
import { FlowStepEditor } from './components/FlowStepEditor.js';
import { ChatPanel } from './components/ChatPanel.js';
import { PromptOutput } from './components/PromptOutput.js';
import { PreviewTab } from './components/PreviewTab.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { StepNav } from './components/StepNav.js';
import { GenerateSummary } from './components/GenerateSummary.js';
import { TabBar } from './components/TabBar.js';
import { usePromptBuilder } from './hooks/use-prompt-builder.js';
import { useTheme } from './hooks/use-theme.js';
import { DEFAULT_CONFIG } from './lib/llm-client.js';
import { pickRandomPreset } from './lib/sample-presets.js';
import type { LlmConfig } from './lib/llm-client.js';

const STEPS = [
  { id: 'domain', label: 'Domain', icon: '1' },
  { id: 'flow', label: 'Flow', icon: '2' },
  { id: 'generate', label: 'Generate', icon: '3' },
] as const;

const TABS = ['chat', 'output', 'preview'] as const;

export function App() {
  const { theme, toggle: toggleTheme } = useTheme();

  const [llmConfig, setLlmConfig] = useState<LlmConfig>(() => {
    const saved = localStorage.getItem('mdma-builder-llm-config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [previewLlmOverride, setPreviewLlmOverride] = useState<Partial<LlmConfig>>(() => {
    const saved = localStorage.getItem('mdma-builder-preview-llm-override');
    return saved ? JSON.parse(saved) : {};
  });

  const handleConfigChange = (config: LlmConfig) => {
    setLlmConfig(config);
    localStorage.setItem('mdma-builder-llm-config', JSON.stringify(config));
  };

  const handlePreviewOverrideChange = (override: Partial<LlmConfig>) => {
    setPreviewLlmOverride(override);
    localStorage.setItem('mdma-builder-preview-llm-override', JSON.stringify(override));
  };

  const previewLlmConfig: LlmConfig = {
    ...llmConfig,
    ...Object.fromEntries(Object.entries(previewLlmOverride).filter(([, v]) => v)),
  };

  const pb = usePromptBuilder(llmConfig);
  const [step, setStep] = useState('domain');
  const [activeTab, setActiveTab] = useState<string>('chat');

  const handleSample = () => {
    const preset = pickRandomPreset();
    pb.setDomain(preset.domain);
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  const tabIndicators = useMemo(() => {
    if (!pb.generatedPrompt) return {};
    return { output: 'bg-success', preview: 'bg-primary' };
  }, [pb.generatedPrompt]);

  const stepContent: Record<string, React.ReactNode> = {
    domain: <DomainForm domain={pb.domain} onChange={pb.setDomain} onSample={handleSample} />,
    flow: <FlowStepEditor flowSteps={pb.domain.flowSteps} onChange={pb.updateFlowSteps} />,
    generate: <GenerateSummary domain={pb.domain} />,
  };

  return (
    <div className="flex flex-col h-screen bg-surface-0 text-text-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border-light">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold m-0">
            <span className="text-primary">MDMA</span> Prompt Builder
          </h1>
          <span className="text-xs text-text-muted hidden sm:inline">
            Generate custom prompts for your MDMA-powered chat
          </span>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Left panel */}
        <aside className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border-light overflow-y-auto flex-shrink-0 flex flex-col">
          <StepNav steps={STEPS} currentStep={step} onStepChange={setStep} />
          <div className="flex-1 overflow-y-auto p-4">{stepContent[step]}</div>
          <div className="flex gap-2 p-4 border-t border-border-light">
            <button
              type="button"
              onClick={() => {
                const prev = STEPS[currentStepIndex - 1];
                if (prev) setStep(prev.id);
              }}
              disabled={currentStepIndex === 0}
              className="px-4 py-2 text-sm rounded-lg border border-border bg-surface-1 text-text-secondary hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                const next = STEPS[currentStepIndex + 1];
                if (next) setStep(next.id);
              }}
              disabled={currentStepIndex === STEPS.length - 1}
              className="px-4 py-2 text-sm rounded-lg border border-primary bg-primary-light text-primary-text font-medium hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-1"
            >
              Next
            </button>
          </div>
        </aside>

        {/* Right panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <TabBar
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            indicators={tabIndicators}
          />
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            {activeTab === 'chat' ? (
              <ChatPanel
                messages={pb.messages}
                isGenerating={pb.isGenerating}
                error={pb.error}
                onGenerate={pb.generate}
                onStop={pb.stop}
                onReset={pb.reset}
                config={llmConfig}
                onConfigChange={handleConfigChange}
              />
            ) : activeTab === 'output' ? (
              <PromptOutput prompt={pb.generatedPrompt} isGenerating={pb.isGenerating} />
            ) : (
              <PreviewTab
                customPrompt={pb.generatedPrompt}
                llmConfig={previewLlmConfig}
                llmOverride={previewLlmOverride}
                onOverrideChange={handlePreviewOverrideChange}
                chatConfig={llmConfig}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
